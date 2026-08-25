import type { DataSource } from './data-source';

interface CacheEntry<Value> {
  at: number;
  promise: Promise<Value>;
}

export interface BoardContextCacheDependencies<Context> {
  getBoardContext: () => Promise<Context>;
  getFreshBoardContext: () => Promise<Context>;
  getDataSource: () => DataSource;
  now: () => number;
}

/** Per-source memo provider shared by board context and employer gates. */
export function createBoardContextCache<Context>(
  dependencies: BoardContextCacheDependencies<Context>,
  ttlMs: number,
) {
  const contextCache = new Map<DataSource, CacheEntry<Context>>();
  const contextRefreshes = new Map<DataSource, Promise<Context>>();
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

  function refreshBoardContext(): Promise<Context> {
    const source = dependencies.getDataSource();
    const active = contextRefreshes.get(source);
    if (active) return active;

    const now = dependencies.now();
    let promise: Promise<Context>;
    promise = dependencies
      .getFreshBoardContext()
      .then((context) => {
        if (contextRefreshes.get(source) === promise) {
          contextCache.set(source, {
            at: now,
            promise: Promise.resolve(context),
          });
        }
        return context;
      })
      .finally(() => {
        if (contextRefreshes.get(source) === promise) {
          contextRefreshes.delete(source);
        }
      });
    // Keep the previous successful memo visible to sibling route loaders
    // while the no-store probe is in flight. Replace it only on success.
    contextRefreshes.set(source, promise);
    return promise;
  }

  /** Last successful/in-flight memo regardless of age, used only after an
   * explicit fresh probe fails so the caller can render a fail-closed shell. */
  function readStaleBoardContext(): Promise<Context> | null {
    return contextCache.get(dependencies.getDataSource())?.promise ?? null;
  }

  function resetBoardContextCache(source?: DataSource): void {
    if (source) {
      contextCache.delete(source);
      contextRefreshes.delete(source);
    } else {
      contextCache.clear();
      contextRefreshes.clear();
    }
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
    refreshBoardContext,
    readStaleBoardContext,
    readEmployerOfferGate,
    resetBoardContextCache,
    resetEmployerOfferGateCache,
  };
}
