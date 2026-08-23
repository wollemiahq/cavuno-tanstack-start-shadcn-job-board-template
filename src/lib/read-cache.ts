/**
 * Edge-cache policy for Board API reads (Cloudflare Workers).
 *
 * The anonymous/authed split is a SECURITY invariant: a request carrying an
 * `Authorization` bearer or an `X-Board-Access` grant sees a response that
 * must NEVER be served from a shared cache. The versioned Apply capability is
 * deployment metadata, not viewer identity, and public job data is deliberately
 * country-invariant, so it does not disable caching. The Cloudflare edge cache
 * is keyed by URL, not
 * by request header, and the anonymous and authed views of a listing share one
 * URL — so this hook does two things, together, and they are load-bearing as a
 * pair:
 *
 *   1. Only anonymous legacy GETs (no bearer, no grant, no capability) opt
 *      into `cf.cacheEverything`,
 *      so only the genuinely public "shared-cacheable" view is ever written to
 *      the edge cache.
 *   2. Every authed/grant read AND every mutation is pinned to
 *      `cache: 'no-store'`, so it neither reads nor writes that cache — an
 *      authed viewer can never be served the URL-keyed anonymous body. (Needs a
 *      Workers compatibility date with `cache` support; ours is 2025-09-02.)
 *
 * All TTLs live here, in one place. Do not scatter `cacheTtl` literals across
 * the server functions.
 */
import type { BoardRequest } from '@cavuno/board';

/** Read-cache TTLs, in seconds — the single source of truth. */
export const READ_CACHE_TTL = {
  /** Public content lists + details (jobs, companies, blog, salaries, taxonomy). */
  content: 60,
  /** Board-global reads that rarely change (board context/SEO, employer plans). */
  boardGlobal: 300,
} as const;

/** Workers augments `RequestInit` with a `cf` object; the SDK passes it through. */
type WorkersRequestInit = RequestInit & {
  cf?: { cacheTtl?: number; cacheEverything?: boolean };
};

/**
 * FetchOptions a call site passes to tag a board-global anonymous read with the
 * longer TTL (e.g. the employer offer gate). References the named constant so
 * the number stays in one place.
 */
export function boardGlobalReadCache(): {
  cf: { cacheTtl: number; cacheEverything: true };
} {
  return {
    cf: { cacheTtl: READ_CACHE_TTL.boardGlobal, cacheEverything: true },
  };
}

/**
 * The client `onRequest` hook: attach the edge-cache directive that matches the
 * request's identity. Anonymous GETs become edge-cacheable; anything carrying a
 * bearer or grant, and every mutation, bypasses the cache
 * entirely. Apply metadata is additive and identical for capable and legacy
 * reads; the capability is enforced only on the state-changing Apply seams.
 */
export function applyReadCache(req: BoardRequest): BoardRequest {
  const init = req.init as WorkersRequestInit;
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = init.headers as Headers;
  const viewerSpecific =
    headers.has('authorization') || headers.has('x-board-access');

  if (method === 'GET' && !viewerSpecific) {
    // Respect an explicit board-global TTL a call site already tagged;
    // otherwise apply the default short content TTL.
    if (!init.cf?.cacheEverything) {
      init.cf = {
        cacheTtl: READ_CACHE_TTL.content,
        cacheEverything: true,
      };
    }
  } else {
    // Authed/grant read or any mutation → never touch the shared edge cache.
    init.cache = 'no-store';
  }

  return req;
}
