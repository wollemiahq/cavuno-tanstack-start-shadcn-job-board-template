import { placeLinkSlug } from './place-link';

import type { PublicLocation, PublicPlace, TalentPlace } from '@cavuno/board';

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
  /**
   * Level of a worldwide location-search result (`country`, `region`,
   * `city` or `locality`). Board places leave it unset.
   */
  placeType?: string | null;
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
  // Board-language slug and name: a pick opens the canonical location URL
  // directly instead of an English slug that 308s to it.
  const slug = placeLinkSlug(place);
  if (!slug) return null;

  return {
    id: place.id,
    slug,
    name: place.displayName,
    contextLabel: contextLabel(place.countryCode, locale),
    countryCode: place.countryCode,
    regionCode: place.regionCode,
  };
}

/**
 * A suggested place (`taxonomy.places.suggest`: any settlement, not only the
 * board's job places) as a location option. It links by its canonical slug
 * like a board place; its `name` is the place itself and its `displayName`
 * adds the region and country, which the option shows as context so two
 * towns of one name stay apart. Its `id` is never a `locationId`.
 */
export function toSuggestedPlaceVM(
  place: PublicPlace,
  locale: string,
): LocationSuggestionVM | null {
  const slug = placeLinkSlug(place);
  if (!slug) return null;

  return {
    id: place.id,
    slug,
    name: place.name,
    contextLabel:
      displayNameContext(place.name, place.displayName) ??
      contextLabel(place.countryCode, locale),
    countryCode: place.countryCode,
    regionCode: place.regionCode,
    placeType: place.placeType,
  };
}

/**
 * The region and country part of a suggested place's `displayName`
 * ("Sydney, New South Wales, Australia" for "Marrickville, Sydney, New South
 * Wales, Australia"); `null` when the display name adds nothing.
 */
function displayNameContext(name: string, displayName: string) {
  const comma = displayName.indexOf(',');
  const rest = displayName.startsWith(name)
    ? displayName.slice(name.length)
    : comma >= 0
      ? displayName.slice(comma)
      : '';
  return rest.replace(/^[\s,]+/, '').trim() || null;
}

/** A place name compared without case, accents or extra spaces. */
function foldPlaceName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Whether a suggested place is one of the board's own settlements: same
 * name and country, the board place is a city or locality, and the
 * suggestion's region is unknown or the same. A board place with no region
 * never hides a suggestion that has one: a duplicate row is better than
 * hiding Portland, Maine behind the board's Portland, Oregon.
 */
function isBoardSettlement(boardPlace: PublicPlace, suggestion: PublicPlace) {
  if (boardPlace.placeType !== 'city' && boardPlace.placeType !== 'locality') {
    return false;
  }
  if (!boardPlace.countryCode) return false;
  if (boardPlace.countryCode !== suggestion.countryCode) return false;
  if (
    suggestion.regionCode !== null &&
    suggestion.regionCode !== boardPlace.regionCode
  ) {
    return false;
  }
  const name = foldPlaceName(suggestion.name);
  // A board place's `displayName` is its board-language name and `name`
  // the English one; a suggestion's `name` is in the board language.
  return (
    foldPlaceName(boardPlace.displayName) === name ||
    foldPlaceName(boardPlace.name) === name
  );
}

/**
 * The suggested places to list after the board's own places: every one
 * except those that are one of the board's settlements.
 */
export function suggestionsBeyondBoardPlaces(
  boardPlaces: readonly PublicPlace[],
  suggestions: readonly PublicPlace[],
): PublicPlace[] {
  return suggestions.filter(
    (suggestion) =>
      !boardPlaces.some((boardPlace) =>
        isBoardSettlement(boardPlace, suggestion),
      ),
  );
}

/**
 * A place as a `/talent` location option: one the board's directory
 * candidates live in, or a job place when that list is unavailable. Its value
 * is the English `slug`, the talent directory's `place` filter; never a job
 * location page slug.
 */
export function toTalentPlaceSuggestionVM(
  place: TalentPlace | PublicPlace,
  locale: string,
): LocationSuggestionVM | null {
  if (!place.slug) return null;

  return {
    id: place.id,
    slug: place.slug,
    name: place.displayName ?? place.name,
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
    placeType: location.placeType,
  };
}
