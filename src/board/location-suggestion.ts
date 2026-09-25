import type { PublicLocation, PublicPlace } from '@cavuno/board';

export interface LocationSuggestionVM {
  id: string;
  slug: string;
  name: string;
  /**
   * Name with its parent context (`Berlin, Germany`) — set for worldwide
   * location-search results, which commit it as the stored display text.
   * Board places have no such field.
   */
  fullName?: string;
  contextLabel: string | null;
  /** ISO country code — the job-posting office-location payload carries it. */
  countryCode: string | null;
  regionCode: string | null;
}

function contextLabel(countryCode: string | null, locale: string) {
  if (!countryCode) return null;

  try {
    return (
      new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode) ??
      countryCode
    );
  } catch {
    return countryCode;
  }
}

/** Resolve a Board place into the complete location-option presentation model. */
export function toLocationSuggestionVM(
  place: PublicPlace,
  locale: string,
): LocationSuggestionVM | null {
  if (!place.slug) return null;

  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    contextLabel: contextLabel(place.countryCode, locale),
    countryCode: place.countryCode,
    regionCode: place.regionCode,
  };
}

/**
 * A worldwide location-search result as a location option. Its `id` is the
 * `locationId` a job office location accepts; there is no public slug, so the
 * id doubles as the option's string value.
 */
export function toGlobalLocationSuggestionVM(
  location: PublicLocation,
): LocationSuggestionVM {
  return {
    id: location.id,
    slug: location.id,
    name: location.name,
    fullName: location.fullName,
    contextLabel: location.contextLabel,
    countryCode: location.countryCode,
    regionCode: null,
  };
}
