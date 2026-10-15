/**
 * Edge-cache policy for Board API reads (Cloudflare Workers).
 *
 * The anonymous/authed split is a SECURITY invariant: a request carrying an
 * `Authorization` bearer, an `X-Board-Access` grant, or the versioned Apply
 * capability sees a response that must NEVER be served from a shared cache.
 * The Cloudflare edge cache is keyed by URL, not
 * by request header, and the anonymous and authed views of a listing share one
 * URL — so this hook does two things, together, and they are load-bearing as a
 * pair:
 *
 *   1. Only anonymous legacy GETs (no bearer, no grant, no capability) opt
 *      into `cf.cacheEverything`,
 *      so only the genuinely public "shared-cacheable" view is ever written to
 *      the edge cache.
 *   2. Every authed/grant/capable read AND every mutation is pinned to
 *      `cache: 'no-store'`, so it neither reads nor writes that cache — an
 *      authed or capability-aware viewer can never be served the URL-keyed
 *      anonymous body. (Needs a Workers compatibility date with `cache`
 *      support; ours is 2025-09-02.)
 *
 * Content reads carry no `cacheTtl`: the Board API's own shared-cache policy
 * (`Cloudflare-CDN-Cache-Control`: 5 min fresh, then up to 1 h
 * stale-while-revalidate / stale-if-error) sets how long the edge keeps them.
 * A `cacheTtl` would replace that policy with a fixed TTL and no stale window,
 * and would also store responses origin marks `private` or `no-store`.
 * `cacheEverything` stays because Cloudflare does not cache JSON by default.
 *
 * Errors are never edge-cached: `cacheTtlByStatus` pins 400-599 to `-1`
 * ("any negative value instructs Cloudflare not to cache at all"). Without it,
 * a header-less 404 gets Cloudflare's default 3 min edge TTL, so a job
 * published just after a miss would 404 at the edge for minutes. Only the
 * listed statuses are overridden; 2xx keep following origin's headers.
 *
 * The one explicit TTL lives here. Do not scatter `cacheTtl` literals across
 * the server functions.
 */
import type { BoardRequest } from '@cavuno/board';

/** Read-cache TTLs, in seconds — the single source of truth. */
export const READ_CACHE_TTL = {
  /** Board-global reads that rarely change (board context/SEO, employer plans). */
  boardGlobal: 300,
} as const;

type BoardGlobalCacheOptions = {
  cf: { cacheTtl: number; cacheEverything: true };
};

/**
 * Per-status edge TTLs for anonymous reads: never store a 4xx/5xx. A negative
 * value means "do not cache"; statuses not listed keep following origin.
 */
export const EDGE_NEVER_CACHE_ERRORS = { '400-599': -1 } as const;

/** Workers augments `RequestInit` with a `cf` object; the SDK passes it through. */
type WorkersRequestInit = RequestInit & {
  cf?: {
    cacheTtl?: number;
    cacheEverything?: boolean;
    cacheTtlByStatus?: Record<string, number>;
  };
};

/**
 * FetchOptions a call site passes to tag a board-global anonymous read with the
 * longer TTL (e.g. the employer offer gate). References the named constant so
 * the number stays in one place.
 */
export function boardGlobalReadCache(): BoardGlobalCacheOptions {
  return {
    cf: { cacheTtl: READ_CACHE_TTL.boardGlobal, cacheEverything: true },
  };
}

/**
 * The client `onRequest` hook: attach the edge-cache directive that matches the
 * request's identity. Anonymous GETs become edge-cacheable for as long as the
 * Board API's cache headers allow; anything carrying a
 * bearer, grant, or capability header, and every mutation, bypasses the cache
 * entirely. Starter job-detail reads intentionally use the capability to ask
 * Cavuno for a different Apply shape, so they must never share a URL-keyed
 * edge entry with legacy readers.
 */
export function applyReadCache(req: BoardRequest): BoardRequest {
  // SAFETY: BoardRequest.init is the fetch init object handed to the SDK hook;
  // WorkersRequestInit adds Cloudflare's `cf` cache controls used below.
  const init = req.init as WorkersRequestInit;
  const method = (init.method ?? 'GET').toUpperCase();
  // SAFETY: The SDK passes a Headers instance into this request hook; header
  // presence is the cache-safety boundary for viewer-specific reads.
  const headers = init.headers as Headers;
  const viewerSpecific =
    headers.has('authorization') ||
    headers.has('x-board-access') ||
    headers.has('x-cavuno-board-capabilities');

  // Feature-gate/kill-switch reads may explicitly require the latest value.
  // Never layer Cloudflare's shared cache back onto those requests.
  if (init.cache === 'no-store') {
    delete init.cf;
    return req;
  }

  if (method === 'GET' && !viewerSpecific) {
    // Respect an explicit board-global TTL a call site already tagged;
    // otherwise make the read cacheable, let origin's headers set the 2xx
    // TTL, and keep error responses out of the edge cache.
    if (!init.cf?.cacheEverything) {
      init.cf = {
        cacheEverything: true,
        cacheTtlByStatus: { ...EDGE_NEVER_CACHE_ERRORS },
      };
    }
  } else {
    // Authed/grant read or any mutation → never touch the shared edge cache.
    init.cache = 'no-store';
  }

  return req;
}
