import { isBoardApiError } from '@cavuno/board';
/**
 * Board-password challenge: verify the password (storing the grant in a
 * host-owned httpOnly cookie scoped to the active data source), and convert a
 * gated read's two recoverable failures — the password wall and a refused
 * bearer — into a redirect and a bearer rotation respectively.
 */
import { redirect } from '@tanstack/react-router';
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start';
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server';

import { getBoard, getSessionRefresher } from '../lib/board';
import {
  clearSessionForSource,
  getDataSource,
  parseSessionForSource,
  serializeGrantForSource,
  serializeSessionForSource,
} from '../lib/data-source.server';

import type { BoardAccessContext } from '../lib/board-access-middleware';

/**
 * Verify a board password and persist the grant as a host-owned httpOnly
 * cookie for the **active data source** only (dual-source: primary and demo
 * grants are isolated by cookie name, same as sessions). Opaque on failure —
 * a wrong password AND a board that isn't protected both return `{ ok: false }`
 * (the v1 endpoint 401s `board_password_invalid` in both cases), so a caller
 * can't probe protection state.
 */
export const verifyBoardPassword = createServerFn({ method: 'POST' })
  .validator((input: { password: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const grant = await getBoard().password.verify(data.password);
      setResponseHeader(
        'Set-Cookie',
        serializeGrantForSource(grant.token, getDataSource()),
      );
      return { ok: true };
    } catch (error) {
      if (isBoardApiError(error)) return { ok: false };
      throw error;
    }
  });

/** The gated-read failures the host recovers from rather than surfacing. */
export type GatedReadRecovery = 'password_wall' | 'dead_bearer' | null;

/**
 * PURE classification of a gated-read failure — the seam worth testing, since
 * it turns on exact API error codes:
 *
 *  - `board_password_required` — the board is walled and this viewer has no
 *    grant. Recoverable by the /password challenge.
 *  - `board_auth_invalid_token` / `board_auth_token_expired` — the API refused
 *    the bearer. Both go down the same path, because neither code tells you
 *    whether the SESSION is dead.
 *
 * That last point is the trap. `board_auth_invalid_token` looks like "this
 * identity is gone", and for a deleted row or a stale `authVersion`/`accountId`
 * claim it is. But the API raises the identical code for a bad signature and a
 * wrong `iss`/`aud` — it is deliberately one opaque code for all of them. Yet
 * refresh tokens are opaque and hashed, so refreshing never verifies a JWT at
 * all; it mints a new one from the live row. Rotate the board signing key and
 * every access token fails while every refresh token still works. Treating the
 * code as proof of death would clear the cookie, throw away a perfectly good
 * refresh token, and sign out an entire board that one refresh would have
 * healed silently. So: always try the refresh, and let ITS result decide.
 */
export function classifyGatedReadError<T>(error: T): GatedReadRecovery {
  if (!isBoardApiError(error)) return null;
  if (error.code === 'board_password_required') return 'password_wall';
  if (
    error.code === 'board_auth_invalid_token' ||
    error.code === 'board_auth_token_expired'
  ) {
    return 'dead_bearer';
  }
  return null;
}

/** Side effects `gatedRead` needs from the request scope. */
export interface GatedReadEffects {
  /**
   * Rotate the bearer pair from the session cookie, persisting the new pair.
   * Resolves to the fresh access token, or `null` when the session is really
   * dead (burned/revoked refresh token, or no session at all).
   */
  refreshSession: () => Promise<string | null>;
  /** Drop the active data source's session cookie. */
  clearSession: () => void;
}

/**
 * Server-only: these reach `.server` modules. `gatedRead` is a plain export
 * rather than a `createServerFn` handler — which the Start plugin strips from
 * the client graph — and `src/routes/password.tsx` imports this module for
 * `verifyBoardPassword`, so an unguarded call would drag `data-source.server`
 * into the browser bundle and fail import-protection.
 */
const clearBoardSession = createServerOnlyFn(() => {
  setResponseHeader('Set-Cookie', clearSessionForSource(getDataSource()));
});

const refreshBoardSession = createServerOnlyFn(
  async (): Promise<string | null> => {
    const dataSource = getDataSource();
    const session = parseSessionForSource(
      getRequestHeader('cookie') ?? null,
      dataSource,
    );
    if (!session) return null;

    let next;
    try {
      // Single-flight via the shared refresher, so concurrent gated reads in
      // one loader share ONE rotation instead of racing and burning the pair.
      next = await getSessionRefresher()(session);
    } catch {
      // The refresher returns null on a 401 and rethrows the rest; a transport
      // failure is not evidence the session is dead, but we have already lost
      // this read either way, so treat it as unrecoverable for this request.
      return null;
    }
    if (!next) return null;

    setResponseHeader(
      'Set-Cookie',
      serializeSessionForSource(next, dataSource),
    );
    return next.accessToken;
  },
);

/**
 * Run a gated content read with the grant header, recovering from the two
 * failures the host owns. A `BoardApiError` does NOT survive the server-fn RPC
 * boundary, so both MUST be handled here, server-side. Anything else
 * propagates unchanged.
 *
 * A refused bearer is retried once with a freshly rotated one. Only if that
 * rotation fails is the session actually dead — then the cookie is dropped and
 * `UNAUTHENTICATED` is thrown, which is exactly what `requireSessionMiddleware`
 * throws for a viewer with no session at all. Every gated route already maps it
 * (`candidateLoaderError` → `redirect('/auth/sign-in')`) using the route's OWN
 * path for `returnTo`, so this needs no redirect of its own and cannot guess a
 * wrong destination.
 *
 * Deliberately no anonymous retry: `gatedRead` also wraps mutations
 * (`post.ts` job submission, the paywall and talent-access checkouts), and
 * silently repeating one of those without the viewer's identity would file it
 * as somebody else's. Public page loaders have no `UNAUTHENTICATED` handler, so
 * a stranded viewer sees the error page once — then the cleared cookie makes
 * every subsequent request render the normal anonymous page.
 */
export async function gatedRead<T>(
  context: BoardAccessContext,
  read: (headers: Record<string, string>) => Promise<T>,
): Promise<T> {
  return gatedReadUsing(context, read, {
    refreshSession: refreshBoardSession,
    clearSession: clearBoardSession,
  });
}

/** Dependency-explicit form, so the recovery paths are unit-testable. */
export async function gatedReadUsing<T>(
  context: BoardAccessContext,
  read: (headers: Record<string, string>) => Promise<T>,
  effects: GatedReadEffects,
): Promise<T> {
  try {
    return await read(context.boardAccessHeaders);
  } catch (error) {
    const recovery = classifyGatedReadError(error);

    if (recovery === 'password_wall') {
      throw redirect({
        to: '/password',
        search: { redirect: context.currentPath },
      });
    }

    if (recovery !== 'dead_bearer') throw error;

    // Retrying is safe: the API rejects a bad bearer before the handler runs,
    // so the original call had no effect to repeat.
    const accessToken = await effects.refreshSession();

    if (accessToken) {
      return read({
        ...context.boardAccessHeaders,
        authorization: `Bearer ${accessToken}`,
      });
    }

    effects.clearSession();
    throw new Error('UNAUTHENTICATED');
  }
}
