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

  let next: BoardSession | null;
  try {
    next = await refresh(session);
  } catch {
    next = null;
  }

  if (!next) return { session: null, setCookie: 'clear' };
  return { session: next, setCookie: 'rotate' };
}
