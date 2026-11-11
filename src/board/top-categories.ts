import { searchNumber } from '@/lib/pagination';
import type { RelatedSearch } from '@cavuno/board';

export type TaxonomyTermForTiles = {
  canonicalSlug: string;
  displayName: string;
  jobCount?: unknown;
  totalJobCount?: unknown;
};

/**
 * Homepage "browse by category" tiles. `null` means "do not use this
 * payload" — the landing then falls back to page-window relatedSearches.
 * Decode the count at this I/O seam: `totalJobCount` (jobs on the category
 * and its subcategories, what its page shows), else `jobCount` on an API
 * without it. Every term must have a finite count or the whole list is
 * treated as an older/partial API body.
 */
export function topCategoriesFromTaxonomy(
  terms: ReadonlyArray<TaxonomyTermForTiles> | undefined,
): RelatedSearch[] | null {
  if (!terms || terms.length === 0) return null;
  const tiles: RelatedSearch[] = [];
  for (const term of terms) {
    const jobCount =
      searchNumber(term.totalJobCount) ?? searchNumber(term.jobCount);
    if (jobCount === undefined) return null;
    tiles.push({
      type: 'category',
      slug: term.canonicalSlug,
      canonicalSlug: term.canonicalSlug,
      term: term.displayName,
      displayName: term.displayName,
      count: jobCount,
    });
  }
  return tiles;
}
