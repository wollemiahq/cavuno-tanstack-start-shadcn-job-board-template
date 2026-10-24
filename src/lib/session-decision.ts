import { isExpiringSoon, type BoardSession } from '@cavuno/board/server';

import { createRequestMemo } from './request-memo';

/** The rotation call the decision drives; `null` on a 401. */
export type SessionRefresh = (
  session: BoardSession,
) => Promise<BoardSession | null>;

/**
 * Collapse refreshes of one refresh token to a single call per incoming
 * request, never across requests.
 *
 * The SDK refresher holds no shared state, and the API converges concurrent
 * refreshes of the same token, so correctness does not need this. The rate
 * limit does: every refresh POST spends the API's per-IP auth bucket, which
 * all Workers-hosted boards share. One page render runs the session middleware once per
 * server function, so without this one page could send several refreshes.
 * The expiring-soon path and revoked-session recovery both go through the
 * same wrapped refresher, so they share one slot per token.
 *
 * Outside a request scope every call refreshes on its own.
 */
export function collapseRefreshesPerRequest(
  refresh: SessionRefresh,
  getRequestScope: () => Request | null,
): SessionRefresh {
  const refreshes = createRequestMemo<ReturnType<SessionRefresh>>();
  return (session) => {
    const scope = getRequestScope();
    if (!scope) return refresh(session);
    return refreshes.getOrCreate(scope, session.refreshToken, () =>
      refresh(session),
    );
  };
}

/** The resolved session and cookie action for the request adapter. */
export interface SessionResolution {
  session: BoardSession | null;
  setCookie: 'clear' | 'rotate' | null;
  /** A transient refresh failure; the cookie is kept for the next request. */
  refreshError?: unknown;
}

/** Pure session-refresh state transition. */
export async function decideSession(
  session: BoardSession | null,
  now: number,
  refresh: SessionRefresh,
): Promise<SessionResolution> {
  if (!session) return { session: null, setCookie: null };

  if (!isExpiringSoon(session, now)) {
    return { session, setCookie: null };
  }

  try {
    return await rotateOrClear(session, refresh);
  } catch (refreshError) {
    // Keep the cookie so the next request retries. An unexpired access token
    // still works; an expired one reads as signed out for this request only.
    return {
      session: session.expiresAt > now ? session : null,
      setCookie: null,
      refreshError,
    };
  }
}

/**
 * The API rejected a session the cookie still holds (not expiring locally):
 * try ONE rotation, else sign out. The caller retries its request once with
 * the result — the new bearer, or none.
 */
export function decideRejectedSession(
  session: BoardSession,
  refresh: SessionRefresh,
): Promise<SessionResolution & { setCookie: 'clear' | 'rotate' }> {
  return rotateOrClear(session, refresh);
}

/**
 * Only an explicit revoked-session result clears the cookie. Transient
 * failures propagate so the next request can retry the existing session.
 */
async function rotateOrClear(
  session: BoardSession,
  refresh: SessionRefresh,
): Promise<SessionResolution & { setCookie: 'clear' | 'rotate' }> {
  const next = await refresh(session);

  if (!next) return { session: null, setCookie: 'clear' };
  return { session: next, setCookie: 'rotate' };
}
