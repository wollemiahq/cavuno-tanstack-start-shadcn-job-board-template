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

/** The single-use rotation call the decision drives; `null` on a 401. */
export type SessionRefresh = (
  session: BoardSession,
) => Promise<BoardSession | null>;

/**
 * The resolved session plus the cookie side-effect the adapter must perform.
 * `null` cookie → leave the request cookie untouched; `'clear'` → emit the
 * clearing Set-Cookie; `'rotate'` → persist `session` back.
 */
export interface SessionResolution {
  session: BoardSession | null;
  setCookie: 'clear' | 'rotate' | null;
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
export async function decideSession(
  session: BoardSession | null,
  now: number,
  refresh: SessionRefresh,
): Promise<SessionResolution> {
  if (!session) return { session: null, setCookie: null };

  if (!isExpiringSoon(session, now)) {
    return { session, setCookie: null };
  }

  let next: BoardSession | null;
  try {
    next = await refresh(session);
  } catch {
    next = null;
  }

  if (!next) {
    // Burned single-use token (parallel refresh won) or revoked session.
    return { session: null, setCookie: 'clear' };
  }

  return { session: next, setCookie: 'rotate' };
}

/** Thin request/response adapter around the pure {@link decideSession}. */
async function resolveSession(): Promise<SessionContext> {
  const cookieHeader = getRequestHeader('cookie') ?? null;
  const { session, setCookie } = await decideSession(
    parseSessionCookie(cookieHeader),
    Date.now(),
    getSessionRefresher(),
  );

  if (setCookie === 'clear') {
    setResponseHeader('Set-Cookie', clearSessionCookie());
  } else if (setCookie === 'rotate' && session) {
    setResponseHeader('Set-Cookie', serializeSessionCookie(session));
  }

  return {
    session,
    authHeaders: session ? authHeaders(session.accessToken) : {},
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
