/**
 * Session middleware for authenticated server functions.
 *
 * Reads the `__Host-` session cookie for the **active data source**,
 * proactively refreshes the bearer pair when the access token is within
 * 5 minutes of expiry (the SDK has NO auto-refresh by design — refresh
 * tokens are single-use, so the host owns rotation), re-sets the cookie,
 * and exposes the session via context. Auth is enforced HERE, per server
 * function — never in `beforeLoad` route guards alone.
 *
 * Dual-source (DMO-01): each data source has its own cookie name +
 * refresher. Switching data source never destroys the other source's
 * session, and a demo-tenant token is never sent on a real-tenant request.
 *
 * Refresh race note: refresh tokens are single-use, so concurrent
 * requests share ONE rotation via the SDK's single-flight refresher
 * (`createSessionRefresher`, module-scoped in `board.ts`) instead of
 * racing and burning the pair.
 */
import { createMiddleware } from '@tanstack/react-start';
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server';

import { authHeaders, getSessionRefresher } from './board';
import {
  clearSessionForSource,
  getDataSource,
  parseSessionForSource,
  serializeSessionForSource,
} from './data-source.server';

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
 * the single-flight refresher, decide the next session state and the cookie
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
  .server(async ({ next, context }) => {
    if (!context.session) {
      throw new Error('UNAUTHENTICATED');
    }
    return next({ context });
  });
