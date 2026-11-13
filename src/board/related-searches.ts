import {
  companyMarketPath,
  jobsCategoryPath,
  jobsLocationCategoryPath,
  jobsLocationSkillPath,
  jobsSkillPath,
} from '@cavuno/board/paths';
import { MIN_JOBS_PER_INDEXED_PAGE } from '@cavuno/board/sitemap';

import { m } from '../paraglide/messages';

import type { TaxonomyChip } from '@/components/board/taxonomy-tags';
import type { RelatedSearch } from '@cavuno/board';

/**
 * The jobs listing rail's "Related searches" heading — the localized
 * Paraglide default. Operator label overrides were removed from the Board
 * API in 4.0.0.
 */
export function relatedSearchesTitle(): string {
  return m.jobCard_relatedSearchesTitle();
}

/**
 * Map the browse API's `RelatedSearch[]` (job `category`/`skill` terms and
 * company `market` terms) to the
 * crawlable `TaxonomyChip`s the listing rail renders. The href for each term
 * comes from the `@cavuno/board/paths` helper for its type — never a
 * hand-built path — so the rail's internal-linking spine matches the hosted
 * board, sitemap, and emails. Counts are intentionally dropped: the rail uses
 * the plain `TaxonomyTags` link idiom (no count badge), same as the job-detail
 * and salary taxonomy chips.
 */
export function relatedSearchesToChips(
  related: RelatedSearch[] | undefined,
  placeSlug?: string | null,
): TaxonomyChip[] {
  // Show the board-language `displayName`; link the board-language
  // `canonicalSlug` (the English `slug` page redirects on a translated board).
  return (related ?? []).map((r) => ({
    key: `${r.type}-${r.slug}`,
    name: r.displayName,
    href: chipHref(r, placeSlug),
  }));
}

/**
 * On a place's pages a category or skill chip links that place's combination
 * page (`/jobs/locations/{place}/{category}`), which nothing else links. Only
 * when the term has enough jobs: `count` counts this page of results, so it is
 * a floor on the place's jobs for the term and the combination is never thin.
 * Below the floor, and off a place, the chip links the board-wide page.
 */
function chipHref(r: RelatedSearch, placeSlug?: string | null): string {
  if (r.type === 'market') return companyMarketPath(r.canonicalSlug);
  if (placeSlug && r.count >= MIN_JOBS_PER_INDEXED_PAGE) {
    return r.type === 'skill'
      ? jobsLocationSkillPath(placeSlug, r.canonicalSlug)
      : jobsLocationCategoryPath(placeSlug, r.canonicalSlug);
  }
  return r.type === 'skill'
    ? jobsSkillPath(r.canonicalSlug)
    : jobsCategoryPath(r.canonicalSlug);
}
