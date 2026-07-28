import { describe, expect, it, vi } from 'vitest';

/**
 * `decideSession` is the extracted, pure heart of the session middleware — the
 * single-flight-refresh decision and the catch→clear→signed-out branch, with
 * no request/response globals. These tests pin each branch so the security
 * seam (who gets signed out, whose cookie rotates, what a failed refresh does)
 * cannot drift silently. The middleware itself stays a thin adapter that only
 * reads the cookie, applies the returned cookie action, and derives headers.
 */
import type { BoardSession } from '@cavuno/board/server';

// The module imports `./board` and `./data-source.server`, which pull
// `cloudflare:workers` / request headers at load. `decideSession` takes its
// refresher as an argument, so the real board is never touched — stub the
// seams to keep the import graph node-safe.
vi.mock('cloudflare:workers', () => ({ env: {} }));
vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: () => null,
  setResponseHeader: () => {},
}));
vi.mock('./env', () => ({
  getServerEnv: () => ({
    apiUrl: 'https://api.example.test',
    board: 'pk_test',
    demoBoardPrivate: false,
  }),
}));
vi.mock('./board', () => ({
  authHeaders: (token: string) => ({ authorization: `Bearer ${token}` }),
  getSessionRefresher: () => async () => null,
}));

import { decideSession, type SessionRefresh } from './session-middleware';

const NOW = 1_000_000_000_000;
const FIVE_MIN = 5 * 60 * 1000;

function session(overrides: Partial<BoardSession> = {}): BoardSession {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    // Comfortably outside the 5-minute expiring-soon window by default.
    expiresAt: NOW + 60 * 60 * 1000,
    ...overrides,
  };
}

/** A refresher that must never be invoked in this branch. */
const neverRefresh: SessionRefresh = () => {
  throw new Error('refresher should not be called');
};

describe('decideSession — the session-refresh security seam', () => {
  it('no session → stays signed out, no cookie change', async () => {
    await expect(decideSession(null, NOW, neverRefresh)).resolves.toEqual({
      session: null,
      setCookie: null,
    });
  });

  it('valid session (not expiring soon) → passes through, no refresh, no cookie', async () => {
    const current = session();
    await expect(decideSession(current, NOW, neverRefresh)).resolves.toEqual({
      session: current,
      setCookie: null,
    });
  });

  it('expiring-soon session triggers exactly one refresh', async () => {
    const current = session({ expiresAt: NOW + 60 * 1000 }); // < 5 min
    const rotated = session({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      expiresAt: NOW + FIVE_MIN + 60 * 60 * 1000,
    });
    const refresh = vi.fn<SessionRefresh>(async () => rotated);

    const result = await decideSession(current, NOW, refresh);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(current);
    // Success rotates to the fresh pair and asks the adapter to persist it.
    expect(result).toEqual({ session: rotated, setCookie: 'rotate' });
  });

  it('refresh returning null (burned single-use token / 401) → clear + signed out', async () => {
    const current = session({ expiresAt: NOW }); // expired → expiring soon
    const refresh = vi.fn<SessionRefresh>(async () => null);

    await expect(decideSession(current, NOW, refresh)).resolves.toEqual({
      session: null,
      setCookie: 'clear',
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refresh THROWING collapses to the same clear + signed-out branch (never loops)', async () => {
    const current = session({ expiresAt: NOW - 1000 });
    const refresh = vi.fn<SessionRefresh>(async () => {
      throw new Error('network blip / 500');
    });

    await expect(decideSession(current, NOW, refresh)).resolves.toEqual({
      session: null,
      setCookie: 'clear',
    });
  });

  it('an already-expired session is treated as expiring soon (refreshes)', async () => {
    const current = session({ expiresAt: NOW - FIVE_MIN });
    const rotated = session({ accessToken: 'fresh' });
    const refresh = vi.fn<SessionRefresh>(async () => rotated);

    const result = await decideSession(current, NOW, refresh);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.setCookie).toBe('rotate');
    expect(result.session).toBe(rotated);
  });
});
