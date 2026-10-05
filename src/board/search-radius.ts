import {
  distanceUnitForCountry,
  searchRadiusOptions,
  type DistanceUnit,
  type SearchRadiusOption,
} from '@cavuno/board/format';

import type { TaxonomyResolution } from '@cavuno/board';

/**
 * The "within" distance on a location listing. The URL carries `within` in
 * the place's unit (`?within=25` is 25 mi in the US, 25 km in Germany); the
 * API takes kilometres. Only a city or a locality widens: a region or country
 * page already covers everything inside it.
 */

/** The `within` values a URL may carry; the same numbers in miles and km. */
const WITHIN_VALUES: ReadonlySet<number> = new Set(
  searchRadiusOptions('km').map((option) => option.value),
);

/** A URL `within` value, or `undefined` (exact place) when not a preset. */
export function parseSearchRadiusWithin<T>(raw: T): number | undefined {
  const value = Number(raw);
  return WITHIN_VALUES.has(value) ? value : undefined;
}

/** The radius control for one location page. */
export type PlaceSearchRadius = {
  unit: DistanceUnit;
  /** The applied preset, or `null` for jobs in the place itself. */
  selected: SearchRadiusOption | null;
};

/**
 * The radius control `place` takes, with `within` applied; `null` for a
 * region, a country or a place without a point, which show no control: the
 * API widens only a city or locality around its point.
 */
export function placeSearchRadius(
  place: TaxonomyResolution | null,
  within: number | undefined,
): PlaceSearchRadius | null {
  const placeType = place?.geo?.placeType;
  if (placeType !== 'city' && placeType !== 'locality') return null;
  if (place?.geo?.lat == null || place.geo.lng == null) return null;
  const unit = distanceUnitForCountry(place?.geo?.countryCode);
  const selected =
    within === undefined
      ? null
      : (searchRadiusOptions(unit).find((option) => option.value === within) ??
        null);
  return { unit, selected };
}
