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
 * it is safe to hold across requests in the same isolate. The edge already
 * assumes the same: `READ_CACHE_TTL.boardGlobal` is 300s.
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
import { getDataSource } from './data-source.server';
import { boardGlobalReadCache } from './read-cache';

import type { DataSource } from './data-source';

type BoardContext = Awaited<ReturnType<ReturnType<typeof getBoard>['context']>>;

/** Shorter than the 300s edge TTL, so an isolate is never the stalest layer. */
const CONTEXT_TTL_MS = 30_000;

const cache = new Map<
  DataSource,
  { at: number; promise: Promise<BoardContext> }
>();

export function readBoardContext(): Promise<BoardContext> {
  const source = getDataSource();
  const hit = cache.get(source);
  const now = Date.now();
  if (hit && now - hit.at < CONTEXT_TTL_MS) return hit.promise;

  const promise = getBoard()
    .context(boardGlobalReadCache())
    .catch((error: unknown) => {
      // Do not let one failure poison the whole TTL window.
      if (cache.get(source)?.promise === promise) cache.delete(source);
      throw error;
    });
  cache.set(source, { at: now, promise });
  return promise;
}

/** Test seam: drop everything held for the current or all data sources. */
export function resetBoardContextCache(source?: DataSource): void {
  if (source) cache.delete(source);
  else cache.clear();
}

/**
 * Per-isolate memo for the footer/nav "has employer offer page" gate.
 * Root shell reads this on every document; without a memo, soft navigations
 * that re-run the root loader re-hit plans.list + salesLed even though the
 * answer is board-global and stable for the same TTL window as context.
 */
const OFFER_GATE_TTL_MS = CONTEXT_TTL_MS;

const offerGateCache = new Map<
  DataSource,
  { at: number; promise: Promise<{ hasEmployerOfferPage: boolean }> }
>();

export function readEmployerOfferGate(
  load: () => Promise<{ hasEmployerOfferPage: boolean }>,
): Promise<{ hasEmployerOfferPage: boolean }> {
  const source = getDataSource();
  const hit = offerGateCache.get(source);
  const now = Date.now();
  if (hit && now - hit.at < OFFER_GATE_TTL_MS) return hit.promise;

  const promise = load().catch((error: unknown) => {
    if (offerGateCache.get(source)?.promise === promise) {
      offerGateCache.delete(source);
    }
    throw error;
  });
  offerGateCache.set(source, { at: now, promise });
  return promise;
}

export function resetEmployerOfferGateCache(source?: DataSource): void {
  if (source) offerGateCache.delete(source);
  else offerGateCache.clear();
}
