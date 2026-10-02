import {
  COMMUTE_RADIUS_MAX_KM,
  COMMUTE_RADIUS_MIN_KM,
  defaultCommuteRadiusKm,
  distanceUnitToKm,
  kmToDistanceUnit,
  type DistanceUnit,
} from './sdk-distance-shim';

/**
 * The profile's commute distance as a form shows it. The API speaks
 * kilometres (one decimal); the form shows whole numbers in the candidate's
 * unit (miles or kilometres by the home place's country).
 */

/** The home place the commute distance is measured from. */
export type HomePlace = {
  /** Location id from the location search, sent back as `locationId`. */
  id: string;
  countryCode: string | null;
  placeType: string | null;
  city?: string | null;
  /** The place's own name, e.g. `Lyon`; a stored place's full name. */
  name?: string | null;
};

/**
 * Whether a commute distance applies around `place`: only a city or a
 * locality. A region or country matches jobs anywhere in its country. A
 * place saved before its level was recorded counts as a city when it names
 * one.
 */
export function takesCommuteRadius(place: HomePlace | null): boolean {
  if (!place) return false;
  if (place.placeType) {
    return place.placeType === 'city' || place.placeType === 'locality';
  }
  return Boolean(place.city?.trim());
}

/** Whole-number bounds in `unit`: 1–155 mi, 1–250 km. */
export function commuteRadiusBounds(unit: DistanceUnit) {
  return {
    min: Math.ceil(kmToDistanceUnit(COMMUTE_RADIUS_MIN_KM, unit)),
    max: Math.floor(kmToDistanceUnit(COMMUTE_RADIUS_MAX_KM, unit)),
  };
}

/** A kilometre value as the whole number shown in `unit`. */
export function commuteRadiusToDisplay(km: number, unit: DistanceUnit): number {
  return Math.round(kmToDistanceUnit(km, unit));
}

/** A value typed in `unit` as the kilometres to save (one decimal). */
export function commuteRadiusFromDisplay(
  value: number,
  unit: DistanceUnit,
): number {
  return Math.round(distanceUnitToKm(value, unit) * 10) / 10;
}

/** The typed value when it is a number inside the bounds, else `null`. */
export function parseCommuteRadius(
  text: string,
  unit: DistanceUnit,
): number | null {
  const value = text.trim() === '' ? Number.NaN : Number(text);
  const { min, max } = commuteRadiusBounds(unit);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

/** The saved distance, else the market default for `countryCode`. */
export function effectiveCommuteRadiusKm(
  savedKm: number | null | undefined,
  countryCode: string | null | undefined,
  fallbackKm?: number,
): number {
  if (savedKm != null && Number.isFinite(savedKm)) return savedKm;
  return fallbackKm ?? defaultCommuteRadiusKm(countryCode);
}
