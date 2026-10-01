import { isExpiringSoon, type BoardSession } from '@cavuno/board/server';

/** The single-use rotation call the decision drives; `null` on a 401. */
export type SessionRefresh = (
  session: BoardSession,
) => Promise<BoardSession | null>;

/** The resolved session and cookie action for the request adapter. */
export interface SessionResolution {
  session: BoardSession | null;
  setCookie: 'clear' | 'rotate' | null;
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

  return rotateOrClear(session, refresh);
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
 * The catch collapses ANY refresh throw to the signed-out/clear branch (the
 * refresher returns null only on a 401 and rethrows the rest): never loop,
 * never surface the error to the caller.
 */
async function rotateOrClear(
  session: BoardSession,
  refresh: SessionRefresh,
): Promise<SessionResolution & { setCookie: 'clear' | 'rotate' }> {
  let next: BoardSession | null;
  try {
    next = await refresh(session);
  } catch {
    next = null;
  }

  if (!next) return { session: null, setCookie: 'clear' };
  return { session: next, setCookie: 'rotate' };
}
