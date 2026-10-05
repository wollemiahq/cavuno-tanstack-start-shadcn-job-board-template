import {
  defaultSearchRadius,
  distanceUnitForCountry,
  searchRadiusOptions,
  type DistanceUnit,
  type SearchRadiusOption,
} from '@cavuno/board/format';

import type { TaxonomyResolution } from '@cavuno/board';

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

/**
 * The radius control `place` takes, with `within` applied (the default
 * preset when `within` is `undefined`); `null` for a region, a country or a
 * place without a point, which show no control: the API widens only a city
 * or locality around its point.
 */
export function placeSearchRadius(
  place: TaxonomyResolution | null,
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
