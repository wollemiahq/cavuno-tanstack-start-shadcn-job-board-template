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

import type { PlanOfferGate } from './board-context-cache-core';
import type { DataSource } from './data-source';

type BoardContext = Awaited<ReturnType<ReturnType<typeof getBoard>['context']>>;

/**
 * Upper bound on how long an isolate may serve a flipped operator flag. The
 * root shell reads through this memo on every document and soft navigation,
 * so this is also how long header/footer chrome may lag a flag change.
 */
export const CONTEXT_TTL_MS = 30_000;

/**
 * How long an isolate reuses the employer offer gate (do the Pricing /
 * Memberships links show). It only changes when an operator publishes or
 * removes a plan, and the plan reads behind it are already edge-cached for
 * `READ_CACHE_TTL.boardGlobal` (5 min), so a link that appears or disappears
 * a few minutes late is acceptable. A visitor who follows a stale link still
 * gets the live /employers page.
 */
export const OFFER_GATE_TTL_MS = 300_000;

/**
 * How long an isolate reuses "does the board list a product" (the Products
 * link). Products are listed and unlisted at any time, and the Board API
 * marks the products list fresh for 60 s, so the link may lag a listing by
 * at most that long. Riding the 5-minute plan memo (and a forced 5-minute
 * edge TTL) kept a board that was empty when the shell first loaded hiding
 * Products after its first product was listed.
 */
export const PRODUCTS_GATE_TTL_MS = 60_000;

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
  OFFER_GATE_TTL_MS,
  PRODUCTS_GATE_TTL_MS,
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
 * answer is board-global. Held for `OFFER_GATE_TTL_MS`.
 */
export function readEmployerOfferGate(
  load: () => Promise<PlanOfferGate>,
): Promise<PlanOfferGate> {
  return cache.readEmployerOfferGate(load);
}

/**
 * Per-isolate memo for the header's Products link, held for
 * `PRODUCTS_GATE_TTL_MS`. A failed read is never kept.
 */
export function readProductsGate(
  load: () => Promise<boolean>,
): Promise<boolean> {
  return cache.readProductsGate(load);
}

export function resetEmployerOfferGateCache(source?: DataSource): void {
  cache.resetEmployerOfferGateCache(source);
}
