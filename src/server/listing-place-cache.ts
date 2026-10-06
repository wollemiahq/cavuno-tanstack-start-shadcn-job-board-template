/**
 * Per-isolate settled values the location listings reuse so a warm request
 * starts its job list without waiting on the same reads again (see
 * `settled-cache.ts`: each request awaits its own read before storing it).
 */
import { getDataSource } from '../lib/data-source.server';
import { createSettledCache } from '../lib/settled-cache';

import type { PlaceRadiusGeo } from '@/board/search-radius';

/**
 * A place slug's geo as far as the search distance needs it (`null`: the
 * place has none). It decides the radius the job list is asked for.
 */
export const placeRadiusGeoCache = createSettledCache<
  string,
  PlaceRadiusGeo | null
>({ ttlMs: 60 * 60_000, maxEntries: 1_000 });

/**
 * A location combination's own job count in the place (`within=0`), which
 * decides whether its default-distance page is indexed.
 */
export const combinationInPlaceCountCache = createSettledCache<string, number>({
  ttlMs: 5 * 60_000,
  maxEntries: 2_000,
});

/** A cache key scoped to the request's data source (board or demo). */
export function listingCacheKey(...parts: string[]): string {
  return [getDataSource(), ...parts].join('\u0000');
}
