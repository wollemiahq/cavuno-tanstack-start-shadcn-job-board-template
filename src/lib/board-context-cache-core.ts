import { createSettledCache } from './settled-cache';

import type { DataSource } from './data-source';

export interface BoardContextCacheDependencies<Context> {
  getBoardContext: () => Promise<Context>;
  getFreshBoardContext: () => Promise<Context>;
  getDataSource: () => DataSource;
  now: () => number;
}

/**
 * Which operator-facing pages the board actually has. The plan gates ride the
 * same plan reads, so they are memoized together ({@link PlanOfferGate}); the
 * Products link has its own short memo ({@link readProductsGate}).
 */
export type EmployerOfferGate = PlanOfferGate & {
  /** The board lists at least one digital product (the Products link). */
  hasProductsPage: boolean;
};

/** The gates decided by the board's plan catalogue. */
export type PlanOfferGate = {
  hasEmployerOfferPage: boolean;
  hasMembershipPage: boolean;
  hasCandidatePricingPage: boolean;
};

/**
 * Per-source memo provider shared by board context and employer gates.
 *
 * Settled values only (see `settled-cache.ts`): each request awaits its own
 * read and stores the result afterwards, so a cancelled request can never
 * leave a pending promise for later requests to wait on.
 */
export function createBoardContextCache<Context>(
  dependencies: BoardContextCacheDependencies<Context>,
  ttlMs: number,
  /** Plans change far less often than flags; defaults to the context TTL. */
  offerGateTtlMs: number = ttlMs,
  /**
   * Products are listed and unlisted from the dashboard at any time; this
   * memo must not outlive the products list's own freshness. Defaults to the
   * context TTL.
   */
  productsGateTtlMs: number = ttlMs,
) {
  const contextCache = createSettledCache<DataSource, Context>({
    ttlMs,
    now: dependencies.now,
  });
  const offerGateCache = createSettledCache<DataSource, PlanOfferGate>({
    ttlMs: offerGateTtlMs,
    now: dependencies.now,
  });
  const productsGateCache = createSettledCache<DataSource, boolean>({
    ttlMs: productsGateTtlMs,
    now: dependencies.now,
  });

  async function readBoardContext(): Promise<Context> {
    const source = dependencies.getDataSource();
    const hit = contextCache.get(source);
    if (hit !== undefined) return hit;

    const readAt = dependencies.now();
    const context = await dependencies.getBoardContext();
    contextCache.set(source, context, readAt);
    return context;
  }

  /**
   * Fresh read for kill-switch enforcement. The previous memo stays visible
   * to sibling loaders while this is in flight and is replaced only on
   * success.
   */
  async function refreshBoardContext(): Promise<Context> {
    const source = dependencies.getDataSource();
    const readAt = dependencies.now();
    const context = await dependencies.getFreshBoardContext();
    contextCache.set(source, context, readAt);
    return context;
  }

  /** Last successful context regardless of age, used only after an explicit
   * fresh probe fails so the caller can render a fail-closed shell. */
  function readStaleBoardContext(): Promise<Context> | null {
    const stale = contextCache.getStale(dependencies.getDataSource());
    return stale === undefined ? null : Promise.resolve(stale);
  }

  function resetBoardContextCache(source?: DataSource): void {
    if (source) contextCache.delete(source);
    else contextCache.clear();
  }

  async function readEmployerOfferGate(
    load: () => Promise<PlanOfferGate>,
  ): Promise<PlanOfferGate> {
    const source = dependencies.getDataSource();
    const hit = offerGateCache.get(source);
    if (hit !== undefined) return hit;

    const readAt = dependencies.now();
    const gate = await load();
    offerGateCache.set(source, gate, readAt);
    return gate;
  }

  function resetEmployerOfferGateCache(source?: DataSource): void {
    if (source) {
      offerGateCache.delete(source);
      productsGateCache.delete(source);
    } else {
      offerGateCache.clear();
      productsGateCache.clear();
    }
  }

  /**
   * Whether the board lists a product (the Products link). Only a successful
   * read is kept, and only for `productsGateTtlMs`: a failed read rejects and
   * is never remembered, so the caller fails closed for that one request.
   */
  async function readProductsGate(
    load: () => Promise<boolean>,
  ): Promise<boolean> {
    const source = dependencies.getDataSource();
    const hit = productsGateCache.get(source);
    if (hit !== undefined) return hit;

    const readAt = dependencies.now();
    const listed = await load();
    productsGateCache.set(source, listed, readAt);
    return listed;
  }

  return {
    readBoardContext,
    refreshBoardContext,
    readStaleBoardContext,
    readEmployerOfferGate,
    readProductsGate,
    resetBoardContextCache,
    resetEmployerOfferGateCache,
  };
}
