import {
  clearSessionCookie,
  isExpiringSoon,
  parseSessionCookie,
  serializeSessionCookie,
  type BoardSession,
} from '@cavuno/board/server';
/**
 * Session middleware for authenticated server functions.
 *
 * Reads the `__Host-` session cookie, proactively refreshes the bearer
 * pair when the access token is within 5 minutes of expiry (the SDK has
 * NO auto-refresh by design — refresh tokens are single-use, so the
 * host owns rotation), re-sets the cookie, and exposes the session via
 * context. Auth is enforced HERE, per server function — never in
 * `beforeLoad` route guards alone.
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

export interface SessionContext {
  session: BoardSession | null;
  /** Bearer headers for SDK calls; empty when signed out. */
  authHeaders: Record<string, string>;
}

async function resolveSession(): Promise<SessionContext> {
  const cookieHeader = getRequestHeader('cookie') ?? null;
  const session = parseSessionCookie(cookieHeader);
  if (!session) return { session: null, authHeaders: {} };

  if (!isExpiringSoon(session, Date.now())) {
    return { session, authHeaders: authHeaders(session.accessToken) };
  }

  let next: BoardSession | null;
  try {
    next = await getSessionRefresher()(session);
  } catch {
    // Preserves the pre-SDK middleware's behavior: ANY refresh failure
    // (the refresher returns null only on a 401 and rethrows the rest)
    // clears the cookie and continues signed out — never loop.
    next = null;
  }

  if (!next) {
    // Burned single-use token (parallel refresh won) or revoked session.
    setResponseHeader('Set-Cookie', clearSessionCookie());
    return { session: null, authHeaders: {} };
  }

  setResponseHeader('Set-Cookie', serializeSessionCookie(next));
  return { session: next, authHeaders: authHeaders(next.accessToken) };
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
