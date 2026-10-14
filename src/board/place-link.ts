import type { PublicPlace } from '@cavuno/board';

/**
 * The slug to link a directory place by: its board-language `canonicalSlug`,
 * so a translated board links its own URL rather than the English source
 * slug that 308s to it. Falls back to `slug`; `null` when the place has
 * neither and cannot form a location route.
 */
export function placeLinkSlug(
  place: Pick<PublicPlace, 'slug' | 'canonicalSlug'>,
): string | null {
  return place.canonicalSlug ?? place.slug;
}
