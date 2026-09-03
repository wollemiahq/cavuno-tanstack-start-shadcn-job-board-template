/**
 * Per-isolate memo for `board.context()`.
 *
 * The board context (name, language, features) is read 2-3 times while
 * rendering ONE document: the root shell reads it, and the page's own
 * `seoBase()` reads it again to build head tags. Each read was a real
 * upstream round trip — measured at ~280-1400ms on a cold client — so a
 * single page could spend a full extra round trip fetching a value it
 * already had. `queries.ts` claimed the SDK client cached this; it does not.
 *
 * Board config changes when an operator edits settings, not per request, so
 * it is safe to hold across requests in the same isolate for a short TTL.
 *
 * THE UPSTREAM READ IS `no-store`, NOT EDGE-CACHED. The context carries the
 * operator kill switches (blog, talent directory, native applications,
 * messaging, password wall). `/v1/boards/:id` leaves the API edge with
 * `Cache-Control: max-age=14400` (the route asks for 60s; the zone rewrites
 * it), and a Worker fetch's `cf.cacheTtl` cannot shorten an entry that is
 * already sitting in the colo cache — so with the shared edge cache in the
 * path, `blogEnabled: false` kept serving `/blog` for HOURS while the API
 * itself said `features.blog: false` (CJJ live gate, 2026-09-02). One
 * upstream round trip per isolate per 30s is the price of flags that flip
 * when the operator flips them.
 *
 * KEYED BY DATA SOURCE. A deployment normally serves one board, so this map
 * holds a single entry — but the preview/demo switch (`getDataSource()`,
 * cookie-driven) can point requests at a DIFFERENT board in the same
 * process, and an unkeyed memo would serve the demo board's name and
 * language to primary visitors.
 *
 * A rejected read is never retained: the entry is dropped so the next
 * request retries instead of pinning a failure for the whole TTL.
 */
import { getBoard } from './board';
import { createBoardContextCache } from './board-context-cache-core';
import { getDataSource } from './data-source.server';

import type { DataSource } from './data-source';

type BoardContext = Awaited<ReturnType<ReturnType<typeof getBoard>['context']>>;

/** Upper bound on how long an isolate may serve a flipped operator flag. */
const CONTEXT_TTL_MS = 30_000;

/**
 * Both readers bypass the shared edge cache — see the module comment.
 * Exported so a test can pin it; `applyReadCache` strips any `cf` directive
 * when it sees `cache: 'no-store'`.
 */
export const BOARD_CONTEXT_FETCH_OPTIONS = { cache: 'no-store' } as const;

const cache = createBoardContextCache<BoardContext>(
  {
    getBoardContext: () => getBoard().context(BOARD_CONTEXT_FETCH_OPTIONS),
    getFreshBoardContext: () => getBoard().context(BOARD_CONTEXT_FETCH_OPTIONS),
    getDataSource,
    now: Date.now,
  },
  CONTEXT_TTL_MS,
);

export const readBoardContext = cache.readBoardContext;

/** Bypass isolate and shared edge caches for operator kill switches. */
export const refreshBoardContext = cache.refreshBoardContext;

/** Previous memo for fail-closed recovery after a failed freshness probe. */
export const readStaleBoardContext = cache.readStaleBoardContext;

/** Test seam: drop everything held for the current or all data sources. */
export function resetBoardContextCache(source?: DataSource): void {
  cache.resetBoardContextCache(source);
}

/**
 * Per-isolate memo for the footer/nav "has employer offer page" gate.
 * Root shell reads this on every document; without a memo, soft navigations
 * that re-run the root loader re-hit the two plans.list reads even though the
 * answer is board-global and stable for the same TTL window as context.
 */
export function readEmployerOfferGate(
  load: () => Promise<{ hasEmployerOfferPage: boolean }>,
): Promise<{ hasEmployerOfferPage: boolean }> {
  return cache.readEmployerOfferGate(load);
}

export function resetEmployerOfferGateCache(source?: DataSource): void {
  cache.resetEmployerOfferGateCache(source);
}
