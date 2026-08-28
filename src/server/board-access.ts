import { isBoardApiError } from '@cavuno/board';
/**
 * Board-password challenge: verify the password (storing the grant in a
 * host-owned httpOnly cookie scoped to the active data source) and convert a
 * gated read's wall error into the /password redirect.
 */
import { redirect } from '@tanstack/react-router';
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { candidateSignInHref } from '../lib/candidate-return-to';
import {
  clearSessionForSource,
  getDataSource,
  serializeGrantForSource,
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

/** The two gated-read failures the host recovers from rather than surfacing. */
export type GatedReadRecovery = 'password_wall' | 'stranded_session' | null;

/**
 * PURE classification of a gated-read failure — the seam worth testing, since
 * it turns on exact API error codes:
 *
 *  - `board_password_required` — the board is walled and this viewer has no
 *    grant. Recoverable by the /password challenge.
 *  - `board_auth_invalid_token` — the API will NEVER accept this bearer (its
 *    board user is gone, or its `authVersion`/`accountId` claims no longer
 *    match the live row). Only re-authenticating fixes it.
 *
 * Deliberately NOT `board_auth_token_expired`: that one means "refresh or
 * re-login will fix this", and the session middleware's rotation window plus
 * `refreshSession` already own it. Clearing the cookie here would sign out a
 * viewer whose refresh token is still perfectly good.
 */
export function classifyGatedReadError<T>(error: T): GatedReadRecovery {
  if (!isBoardApiError(error)) return null;
  if (error.code === 'board_password_required') return 'password_wall';
  if (error.code === 'board_auth_invalid_token') return 'stranded_session';
  return null;
}

/** Side effects `gatedRead` needs from the request scope. */
export interface GatedReadEffects {
  /** Drop the active data source's session cookie. */
  clearSession: () => void;
}

/**
 * Run a gated content read with the grant header, converting a recoverable
 * failure into a framework `redirect`. The BoardApiError does NOT survive the
 * server-fn RPC boundary, so these MUST be caught here (server-side) and turned
 * into a redirect, which does. Anything else propagates unchanged.
 *
 * A stranded session is cleared before the bounce, otherwise the dead cookie
 * survives and the next gated page repeats the whole round trip. Sign-in is
 * safe to land on afterwards: its loader probes with `sessionUserOrNull`, which
 * reports a signed-out viewer both because the cookie is now gone and because
 * `getSessionUser` swallows the 401 — so there is no bounce back and no loop.
 */
/**
 * Server-only: dropping the cookie reaches `.server` modules. `gatedRead` is a
 * plain export rather than a `createServerFn` handler — which the Start plugin
 * strips from the client graph — and `src/routes/password.tsx` imports this
 * module for `verifyBoardPassword`, so an unguarded call would drag
 * `data-source.server` into the browser bundle and fail import-protection.
 */
const clearBoardSession = createServerOnlyFn(() => {
  setResponseHeader('Set-Cookie', clearSessionForSource(getDataSource()));
});

export async function gatedRead<T>(
  context: BoardAccessContext,
  read: (headers: Record<string, string>) => Promise<T>,
): Promise<T> {
  return gatedReadUsing(context, read, { clearSession: clearBoardSession });
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
    switch (classifyGatedReadError(error)) {
      case 'password_wall':
        throw redirect({
          to: '/password',
          search: { redirect: context.currentPath },
        });
      case 'stranded_session':
        effects.clearSession();
        throw redirect({ href: candidateSignInHref(context.currentPath) });
      default:
        throw error;
    }
  }
}
