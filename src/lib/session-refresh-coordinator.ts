import type { BoardSession } from '@cavuno/board/server';

type SessionRefresh = (session: BoardSession) => Promise<BoardSession | null>;

export type CoordinatedSessionRefresher = SessionRefresh & {
  beginSignOut: (session: BoardSession) => Promise<BoardSession | null>;
};

const SIGN_OUT_BLOCK_MS = 60_000;
const MAX_BLOCKED_TOKENS = 1_024;

/** Adds a sign-out barrier without starting an otherwise unnecessary refresh. */
export function coordinateSessionRefresh(
  refresh: SessionRefresh,
  now: () => number = Date.now,
): CoordinatedSessionRefresher {
  const inflight = new Map<string, Promise<BoardSession | null>>();
  const blockedUntil = new Map<string, number>();

  function pruneBlocked() {
    const timestamp = now();
    for (const [token, expiresAt] of blockedUntil) {
      if (expiresAt <= timestamp) blockedUntil.delete(token);
    }
  }

  const coordinated = (async (session: BoardSession) => {
    pruneBlocked();
    const token = session.refreshToken;
    if ((blockedUntil.get(token) ?? 0) > now()) return null;

    const existing = inflight.get(token);
    if (existing) return existing;

    const attempt = refresh(session).finally(() => {
      if (inflight.get(token) === attempt) inflight.delete(token);
    });
    inflight.set(token, attempt);
    return attempt;
  }) as CoordinatedSessionRefresher;

  coordinated.beginSignOut = (session) => {
    pruneBlocked();
    const token = session.refreshToken;
    blockedUntil.set(token, now() + SIGN_OUT_BLOCK_MS);
    if (blockedUntil.size > MAX_BLOCKED_TOKENS) {
      const oldest = blockedUntil.keys().next().value;
      if (oldest) blockedUntil.delete(oldest);
    }
    return inflight.get(token) ?? Promise.resolve(session);
  };

  return coordinated;
}
