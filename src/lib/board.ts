/**
 * The shared `@cavuno/board` client.
 *
 * One module-scoped, stateless instance serves every request: the
 * server default storage is `nostore`, so NO token ever lives on the
 * instance — authenticated calls pass `{ headers: { authorization } }`
 * per call from the session middleware. This is the SSR pattern the SDK
 * is designed for: one shared, tokenless client, per-request auth.
 */
import { createBoardClient, type BoardSdk } from '@cavuno/board';
import { createSessionRefresher } from '@cavuno/board/server';

import { getServerEnv } from './env';
import { applyReadCache } from './read-cache';

let client: BoardSdk | null = null;

export function getBoard(): BoardSdk {
  if (!client) {
    const { apiUrl, board } = getServerEnv();
    // `onRequest` attaches the edge-cache directive per request: anonymous GETs
    // become shared-cacheable, authed/grant reads + mutations bypass the cache.
    // The anonymous/authed split lives entirely in `applyReadCache` — see the
    // security note there. Per-call state stays per-call (`headers`), so the one
    // shared instance is still safe under SSR.
    client = createBoardClient({
      baseUrl: apiUrl,
      board,
      onRequest: applyReadCache,
    });
  }
  return client;
}

/**
 * The shared single-flight session refresher (one instance for the whole
 * server, like the client above — per-request construction would defeat the
 * single-flight slot that keeps concurrent requests from burning the
 * single-use refresh token).
 */
let refresher: ReturnType<typeof createSessionRefresher> | null = null;

export function getSessionRefresher(): ReturnType<
  typeof createSessionRefresher
> {
  if (!refresher) {
    refresher = createSessionRefresher(getBoard());
  }
  return refresher;
}

/** Bearer headers for one authenticated call. */
export function authHeaders(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}` };
}
