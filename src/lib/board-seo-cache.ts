/**
 * Per-isolate memo for `board.seo()`.
 *
 * One SSR reads it twice: the root shell needs the full payload (ads.txt,
 * IndexNow, GSC) and every page fn needs `canonicalBase` via
 * `readPublicOrigin`, and every later document in the isolate reads it again
 * (2026-09-11: `/seo` reached the API twice per page). The settled value is
 * reused for the TTL window. Concurrent cold reads each fetch: an in-flight
 * read is never shared across requests (see `settled-cache.ts`). Keyed by
 * data source like the board context memo.
 */
import { getBoard } from './board';
import { createBoardSeoReader } from './board-seo-cache-core';
import { getDataSource } from './data-source.server';

/**
 * How long an isolate reuses `board.seo()`. Its fields (ads.txt, IndexNow
 * key, site verification, canonical base, manifest name) change only when an
 * operator edits SEO settings or connects a domain, and `READ_CACHE_TTL`
 * already classes them as board-global (5 min), so minutes of staleness is
 * acceptable. Carries no feature flag or access gate.
 */
export const SEO_TTL_MS = 300_000;

const reader = createBoardSeoReader(
  {
    getBoardSeo: () => getBoard().seo(),
    getDataSource,
    now: Date.now,
  },
  SEO_TTL_MS,
);

export const readBoardSeo = reader.readBoardSeo;
