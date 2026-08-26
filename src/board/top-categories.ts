import { searchNumber } from '@/lib/pagination';
import type { RelatedSearch } from '@cavuno/board';

export type TaxonomyTermForTiles = {
  canonicalSlug: string;
  displayName: string;
  jobCount?: unknown;
};

/**
 * Homepage "browse by category" tiles. `null` means "do not use this
 * payload" — the landing then falls back to page-window relatedSearches.
 * Decode `jobCount` at this I/O seam: every term must have a finite number
 * or the whole list is treated as an older/partial API body.
 */
export function topCategoriesFromTaxonomy(
  terms: ReadonlyArray<TaxonomyTermForTiles> | undefined,
): RelatedSearch[] | null {
  if (!terms || terms.length === 0) return null;
  const tiles: RelatedSearch[] = [];
  for (const term of terms) {
    const jobCount = searchNumber(term.jobCount);
    if (jobCount === undefined) return null;
    tiles.push({
      type: 'category',
      slug: term.canonicalSlug,
      term: term.displayName,
      count: jobCount,
    });
  }
  return tiles;
}
