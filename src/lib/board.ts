/**
 * The shared `@cavuno/board` client(s).
 *
 * One module-scoped, stateless instance serves every request for a given
 * data source: the server default storage is `nostore`, so NO token ever
 * lives on the instance — authenticated calls pass
 * `{ headers: { authorization } }` per call from the session middleware.
 * This is the SSR pattern the SDK is designed for: one shared, tokenless
 * client, per-request auth.
 *
 * Dual-source (DMO-01): when `CAVUNO_DEMO_BOARD` is set, a second lazily-
 * created singleton (and its own single-flight session refresher) serves
 * the demo tenant. `getActiveBoard()` selects by the data-source cookie;
 * `getPreviewBoard()` always prefers the demo client when configured
 * (personas live on the demo tenant). `getBoard()` is an alias of
 * `getActiveBoard()` so every existing data-fetch call site respects the
 * cookie without a mass rename — when the demo key is absent the alias is
 * byte-identical to the pre-dual-source primary-only client.
 */
import { createBoardClient, type BoardSdk } from '@cavuno/board';
import { createSessionRefresher } from '@cavuno/board/server';

import { getDataSource, isDemoBoardConfigured } from './data-source.server';
import { getServerEnv } from './env';
import { applyReadCache } from './read-cache';

import type { DataSource } from './data-source';

let primaryClient: BoardSdk | null = null;
let demoClient: BoardSdk | null = null;

function createClient(board: string): BoardSdk {
  const { apiUrl } = getServerEnv();
  // `onRequest` attaches the edge-cache directive per request: anonymous GETs
  // become shared-cacheable, authed/grant reads + mutations bypass the cache.
  // The anonymous/authed split lives entirely in `applyReadCache` — see the
  // security note there. Per-call state stays per-call (`headers`), so the one
  // shared instance is still safe under SSR.
  return createBoardClient({
    baseUrl: apiUrl,
    board,
    // This is deployment capability, not viewer identity. Cavuno requires it
    // on the controlled Apply seams; sending it globally keeps the stable
    // starter boundary simple without changing public-read cacheability.
    globalHeaders: {
      'x-cavuno-board-capabilities': 'apply-gateway-v1',
    },
    onRequest: applyReadCache,
  });
}

/** Primary (operator) board client — real tenant data. */
export function getPrimaryBoard(): BoardSdk {
  if (!primaryClient) {
    primaryClient = createClient(getServerEnv().board);
  }
  return primaryClient;
}

/**
 * Demo-tenant client when `CAVUNO_DEMO_BOARD` is set; otherwise `null` and
 * never constructs a client (T1).
 */
export function getDemoBoard(): BoardSdk | null {
  const { demoBoard } = getServerEnv();
  if (!demoBoard) return null;
  if (!demoClient) {
    demoClient = createClient(demoBoard);
  }
  return demoClient;
}

/**
 * Client for the current request's data source. Cookie `demo` + configured
 * demo key → demo client; otherwise primary.
 */
export function getActiveBoard(): BoardSdk {
  if (getDataSource() === 'demo') {
    const demo = getDemoBoard();
    if (demo) return demo;
  }
  return getPrimaryBoard();
}

/**
 * Board client for data-fetching call sites. Routes through the active
 * data source so switching the cookie switches all board data. When no
 * demo key is configured this is always the primary client.
 */
export function getBoard(): BoardSdk {
  return getActiveBoard();
}

/**
 * Client persona/preview server functions must use: always the demo
 * tenant when a demo key is configured (sandbox personas live there),
 * else the primary board (legacy sandbox-on-primary).
 */
export function getPreviewBoard(): BoardSdk {
  return getDemoBoard() ?? getPrimaryBoard();
}

/**
 * The shared single-flight session refresher per data source (one instance
 * for the whole server per source — per-request construction would defeat
 * the single-flight slot that keeps concurrent requests from burning the
 * single-use refresh token).
 */
let primaryRefresher: ReturnType<typeof createSessionRefresher> | null = null;
let demoRefresher: ReturnType<typeof createSessionRefresher> | null = null;

export function getPrimarySessionRefresher(): ReturnType<
  typeof createSessionRefresher
> {
  if (!primaryRefresher) {
    primaryRefresher = createSessionRefresher(getPrimaryBoard());
  }
  return primaryRefresher;
}

export function getDemoSessionRefresher(): ReturnType<
  typeof createSessionRefresher
> {
  if (!demoRefresher) {
    const demo = getDemoBoard();
    if (!demo) {
      // Callers must only request the demo refresher when a demo key exists.
      throw new Error(
        'getDemoSessionRefresher() requires CAVUNO_DEMO_BOARD to be set',
      );
    }
    demoRefresher = createSessionRefresher(demo);
  }
  return demoRefresher;
}

export function getActiveSessionRefresher(): ReturnType<
  typeof createSessionRefresher
> {
  if (getDataSource() === 'demo' && isDemoBoardConfigured()) {
    return getDemoSessionRefresher();
  }
  return getPrimarySessionRefresher();
}

/**
 * Session refresher for the active data source (alias so existing middleware
 * keeps working and automatically scopes refresh to the right tenant).
 */
export function getSessionRefresher(): ReturnType<
  typeof createSessionRefresher
> {
  return getActiveSessionRefresher();
}

/** Session refresher matching a concrete data source. */
export function getSessionRefresherFor(
  source: DataSource,
): ReturnType<typeof createSessionRefresher> {
  if (source === 'demo' && isDemoBoardConfigured()) {
    return getDemoSessionRefresher();
  }
  return getPrimarySessionRefresher();
}

/** Bearer headers for one authenticated call. */
export function authHeaders(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}` };
}

/** Test-only: drop singletons so suite cases can re-construct clients. */
export function __resetBoardClientsForTests(): void {
  primaryClient = null;
  demoClient = null;
  primaryRefresher = null;
  demoRefresher = null;
}
