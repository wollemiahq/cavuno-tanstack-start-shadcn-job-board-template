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
  // Show the board-language `displayName`; link the board-language
  // `canonicalSlug` (the English `slug` page redirects on a translated board).
  return (related ?? []).map((r) => ({
    key: `${r.type}-${r.slug}`,
    name: r.displayName,
    href:
      r.type === 'market'
        ? companyMarketPath(r.canonicalSlug)
        : r.type === 'skill'
          ? jobsSkillPath(r.canonicalSlug)
          : jobsCategoryPath(r.canonicalSlug),
  }));
}

/**
 * The companies index "Browse by market" options from the list response's
 * market `relatedSearches`, in the board language (`displayName`, linked by
 * `canonicalSlug`). `null` when the response has none (a search, or an older
 * API), so the caller keeps the markets taxonomy list, which carries English
 * names only.
 */
export function relatedMarketOptions(
  related: RelatedSearch[] | undefined,
): Array<{ slug: string; name: string }> | null {
  const markets = (related ?? [])
    .filter((r) => r.type === 'market')
    .map((r) => ({ slug: r.canonicalSlug, name: r.displayName }));
  return markets.length > 0 ? markets : null;
}
