import type { DataSource } from './data-source';

interface CacheEntry<Value> {
  at: number;
  promise: Promise<Value>;
}

export interface BoardContextCacheDependencies<Context> {
  getBoardContext: () => Promise<Context>;
  getDataSource: () => DataSource;
  now: () => number;
}

/** Per-source memo provider shared by board context and employer gates. */
export function createBoardContextCache<Context>(
  dependencies: BoardContextCacheDependencies<Context>,
  ttlMs: number,
) {
  const contextCache = new Map<DataSource, CacheEntry<Context>>();
  const offerGateCache = new Map<
    DataSource,
    CacheEntry<{ hasEmployerOfferPage: boolean }>
  >();

  function readBoardContext(): Promise<Context> {
    const source = dependencies.getDataSource();
    const hit = contextCache.get(source);
    const now = dependencies.now();
    if (hit && now - hit.at < ttlMs) return hit.promise;

    const promise = dependencies.getBoardContext().catch((error: Error) => {
      if (contextCache.get(source)?.promise === promise) {
        contextCache.delete(source);
      }
      throw error;
    });
    contextCache.set(source, { at: now, promise });
    return promise;
  }

  function resetBoardContextCache(source?: DataSource): void {
    if (source) contextCache.delete(source);
    else contextCache.clear();
  }

  function readEmployerOfferGate(
    load: () => Promise<{ hasEmployerOfferPage: boolean }>,
  ): Promise<{ hasEmployerOfferPage: boolean }> {
    const source = dependencies.getDataSource();
    const hit = offerGateCache.get(source);
    const now = dependencies.now();
    if (hit && now - hit.at < ttlMs) return hit.promise;

    const promise = load().catch((error: Error) => {
      if (offerGateCache.get(source)?.promise === promise) {
        offerGateCache.delete(source);
      }
      throw error;
    });
    offerGateCache.set(source, { at: now, promise });
    return promise;
  }

  function resetEmployerOfferGateCache(source?: DataSource): void {
    if (source) offerGateCache.delete(source);
    else offerGateCache.clear();
  }

  return {
    readBoardContext,
    readEmployerOfferGate,
    resetBoardContextCache,
    resetEmployerOfferGateCache,
  };
}
