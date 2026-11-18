import { searchString } from './pagination';

/** Bound public RPC work before iterating, coercing, or deduplicating input. */
export function validateAnchorJobInput(input: { jobSlugs?: unknown }) {
  const values = Array.isArray(input?.jobSlugs)
    ? input.jobSlugs.slice(0, 10)
    : [];
  return {
    jobSlugs: [
      ...new Set(
        values.flatMap((value) => {
          const slug = searchString(value);
          return slug && slug.length <= 200 ? [slug] : [];
        }),
      ),
    ],
  };
}

/**
 * Bound the alert filter names a page asks for: one alert list's category
 * slugs and place ids, as short strings, deduped.
 */
export function validateAlertFilterNamesInput(input: {
  categorySlugs?: unknown;
  placeIds?: unknown;
}) {
  // A raw bound first, then deduped before the cap, so names shared across
  // alerts don't use it up.
  const strings = (values: readonly unknown[]) =>
    [
      ...new Set(
        values.slice(0, 200).flatMap((value) => {
          const text = searchString(value);
          return text && text.length <= 200 ? [text] : [];
        }),
      ),
    ].slice(0, 20);
  return {
    categorySlugs: strings(
      Array.isArray(input?.categorySlugs) ? input.categorySlugs : [],
    ),
    placeIds: strings(Array.isArray(input?.placeIds) ? input.placeIds : []),
  };
}
