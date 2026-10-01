import { serializeSessionCookie } from '@cavuno/board/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SessionRefresh } from './session-decision';
import type { BoardSession } from '@cavuno/board/server';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Wiring: the real session middleware and `board.ts` refresher collapse
 * refreshes of one token to a single call per incoming request, and share
 * nothing across requests. Each refresh POST spends the API's shared auth rate
 * limit, and a refresh that never settles (its request was cancelled) must not
 * hang another request. The SDK refresher is replaced with a stateless fake,
 * as the SDK refresher is once it no longer shares in-flight refreshes.
 */

const incoming = new AsyncLocalStorage<Request>();
const sdkRefresh = vi.fn<SessionRefresh>();

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => {
    const request = incoming.getStore();
    if (!request) throw new Error('No StartEvent found in AsyncLocalStorage.');
    return request;
  },
  getRequestHeader: (name: string) =>
    incoming.getStore()?.headers.get(name) ?? undefined,
  setResponseHeader: () => {},
}));

vi.mock('@cavuno/board/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@cavuno/board/server')>()),
  createSessionRefresher: () => sdkRefresh,
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

const { sessionMiddleware } = await import('./session-middleware');

const expiring: BoardSession = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresAt: Date.now() + 60 * 1000,
};
const rotated: BoardSession = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  expiresAt: Date.now() + 60 * 60 * 1000,
};

function pageRequest(): Request {
  const cookie = serializeSessionCookie(expiring).split(';')[0]!;
  return new Request('https://board.example.test/', { headers: { cookie } });
}

type MiddlewareOptions = Parameters<
  NonNullable<typeof sessionMiddleware.options.server>
>[0];

/** One server function's pass through the session middleware. */
async function runMiddleware(request: Request): Promise<BoardSession | null> {
  const server = sessionMiddleware.options.server!;
  let session: BoardSession | null = null;
  await incoming.run(request, () =>
    server({
      data: undefined,
      // The middleware is first in the chain and ignores incoming context.
      context: { session: null, authHeaders: {}, dataSource: 'board' },
      method: 'GET',
      serverFnMeta: { id: 'test', name: 'test', filename: 'test.ts' },
      signal: new AbortController().signal,
      // SAFETY: the middleware only reads `context` from what next() returns;
      // the test captures the session it passes and returns a stand-in.
      next: (async (result?: {
        context?: { session: BoardSession | null };
      }) => {
        session = result?.context?.session ?? null;
        return result;
      }) as MiddlewareOptions['next'],
    }),
  );
  return session;
}

afterEach(() => {
  sdkRefresh.mockReset();
});

describe('session refresh collapses per request, never across requests', () => {
  it('concurrent middleware runs in one request send exactly one refresh', async () => {
    sdkRefresh.mockResolvedValue(rotated);
    const request = pageRequest();

    const sessions = await Promise.all(
      Array.from({ length: 5 }, () => runMiddleware(request)),
    );

    expect(sdkRefresh).toHaveBeenCalledTimes(1);
    expect(sessions).toEqual(Array.from({ length: 5 }, () => rotated));
  });

  it('two requests each send their own refresh', async () => {
    sdkRefresh.mockResolvedValue(rotated);

    await runMiddleware(pageRequest());
    await runMiddleware(pageRequest());

    expect(sdkRefresh).toHaveBeenCalledTimes(2);
  });

  it('a refresh that never settles in one request does not block another', async () => {
    sdkRefresh.mockReturnValueOnce(new Promise(() => {}));
    sdkRefresh.mockResolvedValueOnce(rotated);

    void runMiddleware(pageRequest());
    await expect(runMiddleware(pageRequest())).resolves.toEqual(rotated);

    expect(sdkRefresh).toHaveBeenCalledTimes(2);
  });
});
