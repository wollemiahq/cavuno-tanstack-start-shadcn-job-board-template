import {
  BOARD_PATHS as SDK_BOARD_PATHS,
  encodePathSegment,
} from '@cavuno/board/paths';

// Forwards to `talentLocationPath` / `BOARD_PATHS.talentLocations` from
// `@cavuno/board/paths` on the next SDK bump; same names and output.

/** `@cavuno/board/paths` `BOARD_PATHS` plus the talent locations directory. */
export const BOARD_PATHS = {
  ...SDK_BOARD_PATHS,
  talentLocations: '/talent/locations',
} as const;

/** Talent location page for one place, by its (board-language) slug. */
export function talentLocationPath(placeSlug: string): string {
  return `${BOARD_PATHS.talentLocations}/${encodePathSegment(placeSlug)}`;
}

/**
 * How many places one talent place directory read asks for: the API's
 * maximum, busiest first, ancestors included.
 */
export const TALENT_PLACES_LIMIT = 500;
