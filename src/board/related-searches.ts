import {
  companyMarketPath,
  jobsCategoryPath,
  jobsSkillPath,
} from '@cavuno/board/paths';

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
): TaxonomyChip[] {
  return (related ?? []).map((r) => ({
    key: `${r.type}-${r.slug}`,
    name: r.term,
    href:
      r.type === 'market'
        ? companyMarketPath(r.slug)
        : r.type === 'skill'
          ? jobsSkillPath(r.slug)
          : jobsCategoryPath(r.slug),
  }));
}
