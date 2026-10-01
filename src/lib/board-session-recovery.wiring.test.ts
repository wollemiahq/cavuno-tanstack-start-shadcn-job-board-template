import { serializeSessionCookie } from '@cavuno/board/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Wiring: the real SDK client built by `board.ts` routes its resource methods
 * through the recovering `fetch`, so a public content read carrying a revoked
 * cookie session renders the anonymous view and clears the cookie instead of
 * throwing (the "every page is Something went wrong" bug).
 */

let request = new Request('https://board.example.test/');
const setResponseHeader = vi.fn();

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => request,
  getRequestHeader: (name: string) => request.headers.get(name) ?? undefined,
  setResponseHeader: (name: string, value: string) =>
    setResponseHeader(name, value),
}));

vi.mock('./env', () => ({
  getServerEnv: () => ({
    apiUrl: 'https://api.example.test',
    board: 'pk_primary',
    demoBoard: undefined,
    demoBoardPrivate: false,
    devTools: false,
  }),
}));

const { authHeaders, getPrimaryBoard } = await import('./board');

type FakeApiBody =
  | { error: { code: string; message: string } }
  | { data: []; hasMore: boolean; nextCursor: null };

function json(status: number, body: FakeApiBody) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const bearer = new Headers(init.headers).get('authorization');
  if (url.endsWith('/auth/refresh')) {
    return json(401, {
      error: { code: 'board_auth_invalid_token', message: 'revoked' },
    });
  }
  if (bearer === 'Bearer revoked') {
    return json(401, {
      error: {
        code: 'board_auth_invalid_token',
        message: 'Invalid or expired token',
      },
    });
  }
  return json(200, { data: [], hasMore: false, nextCursor: null });
});

beforeEach(() => {
  const cookie = serializeSessionCookie({
    accessToken: 'revoked',
    refreshToken: 'refresh-revoked',
    expiresAt: Date.now() + 60 * 60 * 1000,
  }).split(';')[0]!;
  request = new Request('https://board.example.test/', {
    headers: { cookie },
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockClear();
  setResponseHeader.mockClear();
});

describe('board client session recovery wiring', () => {
  it('a revoked bearer on a content read falls back to the anonymous view and clears the cookie', async () => {
    const result = await getPrimaryBoard().jobs.list(undefined, {
      headers: authHeaders('revoked'),
    });

    expect(result).toMatchObject({ data: [] });
    const lastCall = fetchMock.mock.calls.at(-1)!;
    expect(new Headers(lastCall[1].headers).has('authorization')).toBe(false);
    expect(setResponseHeader).toHaveBeenCalledTimes(1);
    const [name, value] = setResponseHeader.mock.calls[0]!;
    expect(name).toBe('Set-Cookie');
    expect(value).toMatch(/^__Host-cavuno_board_session=;/);
    expect(value).toMatch(/Max-Age=0/);
  });
});
