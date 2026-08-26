import type { RelatedSearch } from '@cavuno/board';

export type TaxonomyTermForTiles = {
  canonicalSlug: string;
  displayName: string;
  jobCount?: unknown;
};

/**
 * Homepage "browse by category" tiles. `null` means "do not use this
 * payload" — the landing then falls back to page-window relatedSearches.
 * A term list without numeric `jobCount` is an older API (or a partial
 * body) and must not be treated as live board-wide totals.
 */
export function topCategoriesFromTaxonomy(
  terms: ReadonlyArray<TaxonomyTermForTiles> | undefined,
): RelatedSearch[] | null {
  if (!terms || terms.length === 0) return null;
  if (!terms.some((term) => typeof term.jobCount === 'number')) return null;
  return terms.map((term) => ({
    type: 'category' as const,
    slug: term.canonicalSlug,
    term: term.displayName,
    count: typeof term.jobCount === 'number' ? term.jobCount : 0,
  }));
}
