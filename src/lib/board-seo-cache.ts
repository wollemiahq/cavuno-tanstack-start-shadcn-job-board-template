/**
 * Per-isolate memo for `board.seo()`.
 *
 * One SSR reads it twice: the root shell needs the full payload (ads.txt,
 * IndexNow, GSC) and every page fn needs `canonicalBase` via
 * `readPublicOrigin`. Both fire in the same millisecond, so each paid its own
 * Board API round trip (2026-09-11: `/seo` reached the API twice per page).
 * Sharing one promise makes it one. Same 30s TTL and data-source keying as
 * the board context memo.
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
