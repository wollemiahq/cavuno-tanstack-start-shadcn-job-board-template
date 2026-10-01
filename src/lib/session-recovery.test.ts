import { BoardApiError, type FetchOptions } from '@cavuno/board';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createSessionRecovery,
  type BoardFetch,
  type SessionRecoveryDependencies,
} from './session-recovery';

import type { DataSource } from './data-source';
import type { SessionRefresh } from './session-decision';
import type { BoardSession } from '@cavuno/board/server';

/**
 * The revoked-session seam: every Board API call goes through the client's
 * `fetch`, so a session the API has revoked (password change, account
 * deletion, server-side logout, sandbox reseed) is recovered HERE — one
 * refresh through the source's refresher, then one retry with the new
 * bearer, or with no bearer after clearing the cookie. These tests drive the
 * wrapper with an in-memory request scope, cookie jar and refresher.
 */

const NOW = 1_000_000_000_000;

function session(accessToken: string, refreshToken = `r-${accessToken}`) {
  return {
    accessToken,
    refreshToken,
    expiresAt: NOW + 60 * 60 * 1000,
  } satisfies BoardSession;
}

function revoked() {
  return new BoardApiError({
    status: 401,
    code: 'board_auth_invalid_token',
    message: 'Invalid or expired token',
    raw: undefined,
  });
}

function bearerOf(init: FetchOptions | undefined): string | null {
  return new Headers(init?.headers).get('authorization');
}

interface Harness {
  scope: Request | null;
  sessions: Partial<Record<DataSource, BoardSession>>;
  refresh: ReturnType<typeof vi.fn<SessionRefresh>>;
  setCookies: string[];
  refresherFor: ReturnType<
    typeof vi.fn<SessionRecoveryDependencies['refresherFor']>
  >;
}

let h: Harness;

function newRequest() {
  return new Request('https://board.example.test/');
}

function recovery() {
  return createSessionRecovery({
    getRequestScope: () => h.scope,
    readSession: (source) => h.sessions[source] ?? null,
    refresherFor: h.refresherFor,
    serializeSession: (s, source) => `rotate:${source}:${s.accessToken}`,
    clearSession: (source) => `clear:${source}`,
    setCookie: (value) => {
      h.setCookies.push(value);
    },
  });
}

beforeEach(() => {
  const refresh = vi.fn<SessionRefresh>(async () => null);
  h = {
    scope: newRequest(),
    sessions: { board: session('revoked') },
    refresh,
    setCookies: [],
    refresherFor: vi.fn(() => refresh),
  };
});

type FakeApi = ReturnType<
  typeof vi.fn<(path: string, init?: FetchOptions) => Promise<string>>
>;

/** A fake API: rejects the revoked bearer, answers anything else. */
function api(): FakeApi {
  return vi.fn(async (_path: string, init?: FetchOptions) => {
    const bearer = bearerOf(init);
    if (bearer === 'Bearer revoked') throw revoked();
    return bearer ? `authed:${bearer}` : 'anonymous';
  });
}

/** A fake API whose every call fails with `error`. */
function failing(error: BoardApiError): FakeApi {
  return vi.fn(async (_path: string, _init?: FetchOptions) => {
    throw error;
  });
}

function asBoardFetch(fake: FakeApi): BoardFetch {
  return async <T>(path: string, init?: FetchOptions) =>
    // SAFETY: the fake answers strings and each test reads them back as such.
    (await fake(path, init)) as T;
}

function wrap(fetch: FakeApi, source: DataSource = 'board') {
  return recovery().wrapFetch(asBoardFetch(fetch), source);
}

describe('revoked session recovery at the Board API client seam', () => {
  it('(a) 401 with a session → refresh ok → retried with the new bearer, cookie rotated', async () => {
    h.refresh.mockResolvedValue(session('fresh'));
    const fetch = api();

    const result = await wrap(fetch)('/jobs', {
      headers: { authorization: 'Bearer revoked', 'x-board-access': 'g' },
    });

    expect(result).toBe('authed:Bearer fresh');
    expect(h.refresh).toHaveBeenCalledTimes(1);
    expect(h.refresh).toHaveBeenCalledWith(session('revoked'));
    expect(fetch).toHaveBeenCalledTimes(2);
    const retried = new Headers(fetch.mock.calls[1]![1]?.headers);
    expect(retried.get('authorization')).toBe('Bearer fresh');
    expect(retried.get('x-board-access')).toBe('g');
    expect(h.setCookies).toEqual(['rotate:board:fresh']);
  });

  it('(b) 401 → refresh fails → cookie cleared, retried anonymously, anonymous result returned', async () => {
    const fetch = api();

    const result = await wrap(fetch)('/jobs', {
      method: 'GET',
      headers: { authorization: 'Bearer revoked', 'x-board-access': 'g' },
      query: { limit: 20 },
    });

    expect(result).toBe('anonymous');
    expect(h.setCookies).toEqual(['clear:board']);
    expect(fetch).toHaveBeenCalledTimes(2);
    const [path, init] = fetch.mock.calls[1]!;
    expect(path).toBe('/jobs');
    expect(init?.query).toEqual({ limit: 20 });
    const retried = new Headers(init?.headers);
    expect(retried.has('authorization')).toBe(false);
    expect(retried.get('x-board-access')).toBe('g');
  });

  it('(b) a refresher that throws collapses to the same clear + anonymous retry', async () => {
    h.refresh.mockRejectedValue(new Error('network'));
    const fetch = api();

    await expect(
      wrap(fetch)('/jobs', { headers: { authorization: 'Bearer revoked' } }),
    ).resolves.toBe('anonymous');
    expect(h.setCookies).toEqual(['clear:board']);
  });

  it('(c) a non-401 error is rethrown untouched, with no refresh or retry', async () => {
    const boom = new BoardApiError({
      status: 500,
      code: 'x',
      message: 'x',
      raw: undefined,
    });
    const fetch = failing(boom);

    await expect(
      wrap(fetch)('/jobs', { headers: { authorization: 'Bearer revoked' } }),
    ).rejects.toBe(boom);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(h.refresh).not.toHaveBeenCalled();
    expect(h.setCookies).toEqual([]);
  });

  it('(c) the board-password 401 is not a session rejection', async () => {
    const gate = new BoardApiError({
      status: 401,
      code: 'board_password_required',
      message: 'x',
      raw: undefined,
    });
    const fetch = failing(gate);

    await expect(
      wrap(fetch)('/jobs', { headers: { authorization: 'Bearer revoked' } }),
    ).rejects.toBe(gate);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(h.refresh).not.toHaveBeenCalled();
  });

  it('(d) a 401 on a call made without a session is rethrown, no refresh or retry', async () => {
    const fetch = failing(revoked());

    await expect(wrap(fetch)('/me')).rejects.toBeInstanceOf(BoardApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(h.refresh).not.toHaveBeenCalled();
    expect(h.setCookies).toEqual([]);
  });

  it('(d) a bearer that is not the cookie session (e.g. a just-issued login) is untouched', async () => {
    const fetch = failing(revoked());

    await expect(
      wrap(fetch)('/me', { headers: { authorization: 'Bearer other' } }),
    ).rejects.toBeInstanceOf(BoardApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(h.refresh).not.toHaveBeenCalled();
  });

  it('(e) at most one retry: a retry that is rejected again is rethrown', async () => {
    h.refresh.mockResolvedValue(session('fresh'));
    const fetch = failing(revoked());

    await expect(
      wrap(fetch)('/me', { headers: { authorization: 'Bearer revoked' } }),
    ).rejects.toBeInstanceOf(BoardApiError);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it('later calls in the same request reuse the outcome: one refresh, no doomed round-trip', async () => {
    const fetch = api();
    const call = wrap(fetch);

    await call('/jobs', { headers: { authorization: 'Bearer revoked' } });
    const second = await call('/companies', {
      headers: { authorization: 'Bearer revoked' },
    });

    expect(second).toBe('anonymous');
    expect(h.refresh).toHaveBeenCalledTimes(1);
    // 2 for the first call (401 + retry), 1 for the second (rewritten up front).
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(bearerOf(fetch.mock.calls[2]![1])).toBeNull();
  });

  it('concurrent calls in one request share a single refresh', async () => {
    h.refresh.mockResolvedValue(session('fresh'));
    const fetch = api();
    const call = wrap(fetch);
    const init = { headers: { authorization: 'Bearer revoked' } };

    const results = await Promise.all([call('/a', init), call('/b', init)]);

    expect(results).toEqual(['authed:Bearer fresh', 'authed:Bearer fresh']);
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it('a separate request recovers on its own (no cross-request memo)', async () => {
    const fetch = api();
    const call = wrap(fetch);
    const init = { headers: { authorization: 'Bearer revoked' } };

    await call('/a', init);
    h.scope = newRequest();
    await call('/a', init);

    expect(h.refresh).toHaveBeenCalledTimes(2);
  });

  it('outside a request scope it does nothing', async () => {
    h.scope = null;
    const fetch = api();

    await expect(
      wrap(fetch)('/a', { headers: { authorization: 'Bearer revoked' } }),
    ).rejects.toBeInstanceOf(BoardApiError);
    expect(h.refresh).not.toHaveBeenCalled();
  });

  it('dual-source: the demo client recovers only the demo session and cookie', async () => {
    h.sessions = { board: session('board-token'), demo: session('revoked') };
    const fetch = api();

    await expect(
      wrap(fetch, 'demo')('/jobs', {
        headers: { authorization: 'Bearer revoked' },
      }),
    ).resolves.toBe('anonymous');
    expect(h.refresherFor).toHaveBeenCalledWith('demo');
    expect(h.refresh).toHaveBeenCalledWith(session('revoked'));
    expect(h.setCookies).toEqual(['clear:demo']);
  });

  it('dual-source: a demo bearer on the primary client never touches the primary cookie', async () => {
    h.sessions = { board: session('board-token'), demo: session('revoked') };
    const fetch = api();

    await expect(
      wrap(fetch, 'board')('/jobs', {
        headers: { authorization: 'Bearer revoked' },
      }),
    ).rejects.toBeInstanceOf(BoardApiError);
    expect(h.refresh).not.toHaveBeenCalled();
    expect(h.setCookies).toEqual([]);
  });

  it('exposes the per-request outcome for a token (for the required-session middleware)', async () => {
    const r = recovery();
    const fetch = api();
    expect(r.outcomeFor('board', 'revoked')).toBeUndefined();

    await r
      .wrapFetch(asBoardFetch(fetch), 'board')('/me', {
        headers: { authorization: 'Bearer revoked' },
      })
      .catch(() => {});

    await expect(r.outcomeFor('board', 'revoked')).resolves.toBeNull();
    expect(r.outcomeFor('demo', 'revoked')).toBeUndefined();
    h.scope = newRequest();
    expect(r.outcomeFor('board', 'revoked')).toBeUndefined();
  });
});
