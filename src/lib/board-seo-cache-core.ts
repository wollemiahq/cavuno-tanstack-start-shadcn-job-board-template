import type { DataSource } from './data-source';

export interface BoardSeoDependencies<T> {
  getBoardSeo: () => Promise<T>;
  getDataSource: () => DataSource;
  now: () => number;
}

/**
 * One shared `board.seo()` promise per data source per TTL window. A rejected
 * read is dropped so the next request retries instead of pinning a failure.
 */
export function createBoardSeoReader<T>(
  dependencies: BoardSeoDependencies<T>,
  ttlMs: number,
) {
  const cache = new Map<DataSource, { at: number; promise: Promise<T> }>();

  function readBoardSeo(): Promise<T> {
    const source = dependencies.getDataSource();
    const now = dependencies.now();
    const hit = cache.get(source);
    if (hit && now - hit.at < ttlMs) return hit.promise;

    const promise = dependencies.getBoardSeo();
    cache.set(source, { at: now, promise });
    promise.catch(() => {
      if (cache.get(source)?.promise === promise) cache.delete(source);
    });
    return promise;
  }

  return { readBoardSeo, reset: () => cache.clear() };
}
