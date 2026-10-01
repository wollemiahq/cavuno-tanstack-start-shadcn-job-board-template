/**
 * Session middleware for authenticated server functions.
 *
 * Reads the `__Host-` session cookie for the **active data source**,
 * proactively refreshes the bearer pair when the access token is within
 * 5 minutes of expiry (the SDK has NO auto-refresh by design, so the host
 * owns rotation), re-sets the cookie,
 * and exposes the session via context. Auth is enforced HERE, per server
 * function — never in `beforeLoad` route guards alone.
 *
 * Dual-source (DMO-01): each data source has its own cookie name +
 * refresher. Switching data source never destroys the other source's
 * session, and a demo-tenant token is never sent on a real-tenant request.
 *
 * Refresh race note: the SDK refresher holds no shared state, and the API
 * converges concurrent refreshes of one token, so racing requests each
 * refresh safely. Within ONE incoming request the refresher from `board.ts`
 * collapses refreshes of a token to a single call (`collapseRefreshesPerRequest`):
 * this middleware runs once per server function in a page render, and each
 * refresh spends the API's shared auth rate limit. Nothing is shared across
 * requests.
 */
import { createMiddleware } from '@tanstack/react-start';
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server';

import {
  authHeaders,
  getSessionRecoveryOutcome,
  getSessionRefresher,
} from './board';
import {
  clearSessionForSource,
  getDataSource,
  parseSessionForSource,
  serializeSessionForSource,
} from './data-source.server';
import { guardRequiredSession } from './require-session-guard';

import type { DataSource } from './data-source';
import type { BoardSession } from '@cavuno/board/server';
export {
  decideSession,
  type SessionRefresh,
  type SessionResolution,
} from './session-decision';
import { decideSession } from './session-decision';

export interface SessionContext {
  session: BoardSession | null;
  /** Bearer headers for SDK calls; empty when signed out. */
  authHeaders: Record<string, string>;
  /** Data source whose session this context carries. */
  dataSource: DataSource;
}

/**
 * PURE session-refresh decision (no request/response globals) — the security
 * seam, isolated for unit testing. Given the parsed session, the clock, and
 * the per-request refresher, decide the next session state and the cookie
 * action, WITHOUT touching headers:
 *
 *  - no session               → stay signed out, no cookie change
 *  - valid (not expiring soon) → pass the session through, no cookie change
 *  - expiring soon, refresh ok → rotate to the fresh pair, persist it
 *  - expiring soon, refresh KO → clear the cookie, continue signed out
 *
 * The catch collapses ANY refresh throw to the signed-out/clear branch (the
 * refresher returns null only on a 401 and rethrows the rest) — the pre-SDK
 * middleware's behavior: never loop, never surface the error to the caller.
 */
/** Thin request/response adapter around the pure {@link decideSession}. */
async function resolveSession(): Promise<SessionContext> {
  const dataSource = getDataSource();
  const cookieHeader = getRequestHeader('cookie') ?? null;
  const { session, setCookie } = await decideSession(
    parseSessionForSource(cookieHeader, dataSource),
    Date.now(),
    getSessionRefresher(),
  );

  if (setCookie === 'clear') {
    setResponseHeader('Set-Cookie', clearSessionForSource(dataSource));
  } else if (setCookie === 'rotate' && session) {
    setResponseHeader(
      'Set-Cookie',
      serializeSessionForSource(session, dataSource),
    );
  }

  return {
    session,
    authHeaders: session ? authHeaders(session.accessToken) : {},
    dataSource,
  };
}

/** Optional session: context carries null when signed out. */
export const sessionMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const ctx = await resolveSession();
    return next({ context: ctx });
  },
);

/** Required session: throws 401-shaped error when signed out. */
export const requireSessionMiddleware = createMiddleware({ type: 'function' })
  .middleware([sessionMiddleware])
  // The guard and `getSessionRecoveryOutcome` are referenced only inside
  // `.server()`, which the client build strips; a top-level reference would
  // pull them and `./board`'s server-only imports into the client bundle.
  .server(({ next, context }) =>
    guardRequiredSession(
      context,
      () => next({ context }),
      getSessionRecoveryOutcome,
    ),
  );
