import {
  defaultSearchRadius,
  distanceUnitForCountry,
  searchRadiusOptions,
  type DistanceUnit,
  type SearchRadiusOption,
} from '@cavuno/board/format';

import type {
  PublicPlace,
  TaxonomyGeo,
  TaxonomyResolution,
} from '@cavuno/board';

/**
 * The "within" distance on a location listing. The URL carries `within` in
 * the place's unit (`?within=10` is 10 mi in the US, 10 km in Germany); the
 * API takes kilometres. Without it a city or locality lists jobs within the
 * market default (25 mi or 50 km); `within=0` is the place itself. Only a
 * city or a locality widens: a region or country page already covers
 * everything inside it.
 */

/** `within=0`: jobs in the place itself, no distance. */
export const SEARCH_RADIUS_EXACT = 0;

/** The `within` values a URL may carry; the same numbers in miles and km. */
const WITHIN_VALUES: ReadonlySet<number> = new Set([
  SEARCH_RADIUS_EXACT,
  ...searchRadiusOptions('km').map((option) => option.value),
]);

/**
 * A URL `within` value: a preset, `0` for the exact place, or `undefined`
 * when absent or anything else (the page then uses the default distance).
 */
export function parseSearchRadiusWithin<T>(raw: T): number | undefined {
  const text = String(raw ?? '').trim();
  if (text === '') return undefined;
  const value = Number(text);
  return WITHIN_VALUES.has(value) ? value : undefined;
}

/** The radius control for one location page. */
export type PlaceSearchRadius = {
  unit: DistanceUnit;
  /** The applied preset, or `null` for jobs in the place itself. */
  selected: SearchRadiusOption | null;
  /** The market default preset for `unit`. */
  defaultOption: SearchRadiusOption;
  /**
   * The URL chose the distance (`within` is `0` or a preset). Such a page is
   * a filtered copy of the plain URL: `noindex, follow`, canonical plain.
   */
  explicit: boolean;
};

/** The part of a resolved place the search distance depends on. */
export type PlaceRadiusGeo = Pick<
  NonNullable<TaxonomyGeo>,
  'placeType' | 'lat' | 'lng' | 'countryCode'
>;

/** `geo` reduced to what `placeSearchRadius` reads, for caching. */
export function placeRadiusGeo(
  geo: TaxonomyGeo | undefined,
): PlaceRadiusGeo | null {
  if (!geo) return null;
  const { placeType, lat, lng, countryCode } = geo;
  return { placeType, lat, lng, countryCode };
}

/**
 * The radius control `place` takes, with `within` applied (the default
 * preset when `within` is `undefined`); `null` for a region, a country or a
 * place without a point, which show no control: the API widens only a city
 * or locality around its point.
 */
export function placeSearchRadius(
  place: { geo?: PlaceRadiusGeo | null } | null,
  within: number | undefined,
): PlaceSearchRadius | null {
  const placeType = place?.geo?.placeType;
  if (placeType !== 'city' && placeType !== 'locality') return null;
  if (place?.geo?.lat == null || place.geo.lng == null) return null;
  const unit = distanceUnitForCountry(place?.geo?.countryCode);
  const defaultOption = defaultSearchRadius(unit);
  const selected =
    within === SEARCH_RADIUS_EXACT
      ? null
      : (searchRadiusOptions(unit).find((option) => option.value === within) ??
        defaultOption);
  return { unit, selected, defaultOption, explicit: within !== undefined };
}

/**
 * The place's own name without its region or country ("Houston", not
 * "Houston, Texas, United States"), for the results sentence. The display
 * name is already in the board's language.
 */
export function shortPlaceName(place: TaxonomyResolution): string {
  return place.displayName.split(',')[0]?.trim() || place.displayName;
}

/**
 * The place's own job count from the board's place directory (the list of
 * places with published jobs), matched by slug: `0` when the place is not in
 * it, `null` when the directory could not be read. Jobs within a search
 * distance are not counted.
 */
export function placeJobCount(
  places: readonly Pick<PublicPlace, 'slug' | 'jobCount'>[] | null | undefined,
  place: Pick<TaxonomyResolution, 'sourceSlug' | 'canonicalSlug'>,
): number | null {
  if (!places) return null;
  const entry = places.find(
    (node) =>
      node.slug === place.sourceSlug || node.slug === place.canonicalSlug,
  );
  return entry?.jobCount ?? 0;
}

/**
 * Whether a location listing with `radius` is `noindex, follow` (the plain
 * URL stays canonical): a distance the URL chose, or the default distance on
 * a place with no jobs of its own, which lists only nearby jobs. Index
 * eligibility counts only jobs in the place, as the sitemap does, so the
 * page stays viewable without ranking on nearby jobs. An unknown count
 * (`null`) keeps the page indexable.
 */
export function isSearchRadiusViewNoindex(
  radius: PlaceSearchRadius | null,
  inPlaceJobCount: number | null,
): boolean {
  if (!radius) return false;
  return radius.explicit || inPlaceJobCount === 0;
}
