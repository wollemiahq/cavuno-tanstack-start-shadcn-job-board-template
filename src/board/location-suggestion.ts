import type { PublicPlace } from "@cavuno/board";

export interface LocationSuggestionVM {
  id: string;
  slug: string;
  name: string;
  contextLabel: string | null;
}

function contextLabel(countryCode: string | null, locale: string) {
  if (!countryCode) return null;

  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) ??
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
  };
}
