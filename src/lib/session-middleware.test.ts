import { BoardApiError } from '@cavuno/board';
import { describe, expect, it, vi } from 'vitest';

import {
  decideRejectedSession,
  decideSession,
  type SessionRefresh,
} from './session-decision';
import {
  isSessionRejection,
  requiredSessionFailure,
} from './session-rejection';

/**
 * `decideSession` is the extracted, pure heart of the session middleware — the
 * refresh decision and the catch→clear→signed-out branch, with
 * no request/response globals. These tests pin each branch so the security
 * seam (who gets signed out, whose cookie rotates, what a failed refresh does)
 * cannot drift silently. The middleware itself stays a thin adapter that only
 * reads the cookie, applies the returned cookie action, and derives headers.
 */
import type { BoardSession } from '@cavuno/board/server';

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

  it('refresh returning null (revoked token / 401) → clear + signed out', async () => {
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

function apiError(status: number, code: string): BoardApiError {
  return new BoardApiError({ status, code, message: code, raw: undefined });
}

describe('isSessionRejection — which API errors mean "this session is dead"', () => {
  it('a revoked or expired bearer is a session rejection', () => {
    expect(isSessionRejection(apiError(401, 'board_auth_invalid_token'))).toBe(
      true,
    );
    expect(isSessionRejection(apiError(401, 'board_auth_token_expired'))).toBe(
      true,
    );
    expect(isSessionRejection(apiError(401, 'auth_unauthenticated'))).toBe(
      true,
    );
  });

  it('other 401s (board password gate, bad credentials) are not', () => {
    expect(isSessionRejection(apiError(401, 'board_password_required'))).toBe(
      false,
    );
    expect(
      isSessionRejection(apiError(401, 'board_auth_invalid_credentials')),
    ).toBe(false);
  });

  it('non-401 errors and plain errors are not', () => {
    expect(isSessionRejection(apiError(403, 'auth_forbidden'))).toBe(false);
    expect(isSessionRejection(apiError(500, 'unknown_error'))).toBe(false);
    expect(isSessionRejection(new Error('board_auth_invalid_token'))).toBe(
      false,
    );
  });
});

describe('decideRejectedSession — after the API rejected a live-looking session', () => {
  it('refreshes once regardless of local expiry and rotates on success', async () => {
    const current = session(); // an hour left: decideSession would not refresh
    const rotated = session({ accessToken: 'access-2', refreshToken: 'r-2' });
    const refresh = vi.fn<SessionRefresh>(async () => rotated);

    await expect(decideRejectedSession(current, refresh)).resolves.toEqual({
      session: rotated,
      setCookie: 'rotate',
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(current);
  });

  it('refresh returning null → clear + signed out', async () => {
    await expect(
      decideRejectedSession(session(), async () => null),
    ).resolves.toEqual({ session: null, setCookie: 'clear' });
  });

  it('refresh throwing → clear + signed out', async () => {
    await expect(
      decideRejectedSession(session(), async () => {
        throw new Error('network');
      }),
    ).resolves.toEqual({ session: null, setCookie: 'clear' });
  });
});

describe('requiredSessionFailure — a session-required call whose session was just revoked', () => {
  it('signed out by recovery + a 401 → the canonical UNAUTHENTICATED signal', () => {
    const failure = requiredSessionFailure(
      apiError(401, 'auth_unauthenticated'),
      null,
    );
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toHaveProperty('message', 'UNAUTHENTICATED');
  });

  it('no recovery, a rotated session, or a non-401 error → the original error', () => {
    const unauthorized = apiError(401, 'auth_unauthenticated');
    const notFound = apiError(404, 'job_not_found');
    expect(requiredSessionFailure(unauthorized, undefined)).toBe(unauthorized);
    expect(requiredSessionFailure(unauthorized, session())).toBe(unauthorized);
    expect(requiredSessionFailure(notFound, null)).toBe(notFound);
  });
});
