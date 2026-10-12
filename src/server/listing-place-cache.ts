/**
 * Per-isolate settled values the location listings reuse so a warm request
 * starts its job list without waiting on the same reads again (see
 * `settled-cache.ts`: each request awaits its own read before storing it).
 */
import { getDataSource } from '../lib/data-source.server';
import { createSettledCache } from '../lib/settled-cache';

import {
  placeRadiusGeo,
  placeSearchRadius,
  SEARCH_RADIUS_EXACT,
  type PlaceRadiusGeo,
} from '@/board/search-radius';
import type { TaxonomyResolution } from '@cavuno/board';

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

/**
 * The `radius` (km) a place listing (jobs or talent) asks for: the URL's
 * `within`, or the market default for a city or locality with a point; none
 * (exact) for `within=0`, a region or a country. The API keeps an omitted
 * radius exact, so the place's level and unit decide the kilometres:
 * `within=0` needs neither, a place this isolate resolved before reuses its
 * cached geo, and only a cold slug waits for `placeRead` before the list
 * starts.
 */
export async function listingRadiusKm(
  locationSlug: string,
  placeRead: Promise<TaxonomyResolution | null>,
  within: number | undefined,
): Promise<number | undefined> {
  if (within === SEARCH_RADIUS_EXACT) return undefined;
  const key = listingCacheKey(locationSlug);
  const cached = placeRadiusGeoCache.get(key);
  if (cached !== undefined) {
    return placeSearchRadius({ geo: cached }, within)?.selected?.km;
  }
  const readAt = Date.now();
  const place = await placeRead;
  if (place) placeRadiusGeoCache.set(key, placeRadiusGeo(place.geo), readAt);
  return placeSearchRadius(place, within)?.selected?.km;
}
