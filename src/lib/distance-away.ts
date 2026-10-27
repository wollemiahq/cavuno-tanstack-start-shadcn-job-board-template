import {
  formatDistance,
  kmToDistanceUnit,
  type DistanceUnit,
} from '@cavuno/board/format';

import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';

/**
 * A result card's distance from the searched place, in whole `unit`s:
 * "12 km away", or "< 1 km away" when closer. `null` when the result has no
 * distance (no searched place, or no point) or the place's unit is unknown.
 */
export function distanceAwayLabel(
  km: number | null | undefined,
  unit: DistanceUnit | null | undefined,
  language: string,
): string | null {
  if (km == null || !unit) return null;
  const localeOpt = isLocale(language) ? { locale: language } : undefined;
  const value = kmToDistanceUnit(km, unit);
  if (value < 1) {
    return m.searchRadius_distanceUnderOneAway(
      { distance: formatDistance(1, unit, language) },
      localeOpt,
    );
  }
  return m.searchRadius_distanceAway(
    { distance: formatDistance(Math.round(value), unit, language) },
    localeOpt,
  );
}
