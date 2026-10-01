/**
 * Per-isolate memo for `board.seo()`.
 *
 * One SSR reads it twice: the root shell needs the full payload (ads.txt,
 * IndexNow, GSC) and every page fn needs `canonicalBase` via
 * `readPublicOrigin`, and every later document in the isolate reads it again
 * (2026-09-11: `/seo` reached the API twice per page). The settled value is
 * reused for the TTL window. Concurrent cold reads each fetch: an in-flight
 * read is never shared across requests (see `settled-cache.ts`). Same 30s TTL
 * and data-source keying as the board context memo.
 */
import { getBoard } from './board';
import { createBoardSeoReader } from './board-seo-cache-core';
import { getDataSource } from './data-source.server';

const SEO_TTL_MS = 30_000;

const reader = createBoardSeoReader(
  {
    getBoardSeo: () => getBoard().seo(),
    getDataSource,
    now: Date.now,
  },
  SEO_TTL_MS,
);

export const readBoardSeo = reader.readBoardSeo;
