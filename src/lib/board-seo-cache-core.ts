import { createSettledCache } from './settled-cache';

import type { DataSource } from './data-source';

export interface BoardSeoDependencies<T> {
  getBoardSeo: () => Promise<T>;
  getDataSource: () => DataSource;
  now: () => number;
}

/**
 * One settled `board.seo()` value per data source per TTL window. Each request
 * awaits its own read and stores the result only on success, so a failure is
 * retried by the next request and a cancelled request never leaves a pending
 * read behind for others to wait on (see `settled-cache.ts`).
 */
export function createBoardSeoReader<T>(
  dependencies: BoardSeoDependencies<T>,
  ttlMs: number,
) {
  const cache = createSettledCache<DataSource, T>({
    ttlMs,
    now: dependencies.now,
  });

  async function readBoardSeo(): Promise<T> {
    const source = dependencies.getDataSource();
    const hit = cache.get(source);
    if (hit !== undefined) return hit;

    const readAt = dependencies.now();
    const seo = await dependencies.getBoardSeo();
    cache.set(source, seo, readAt);
    return seo;
  }

  return { readBoardSeo, reset: () => cache.clear() };
}
