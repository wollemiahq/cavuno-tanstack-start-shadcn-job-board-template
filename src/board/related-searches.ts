import type { RelatedSearch } from "@cavuno/board";
import type { BoardLabelOverrides } from "@cavuno/board/format";
import { companyMarketPath, jobsCategoryPath, jobsSkillPath } from "@cavuno/board/paths";

import type { TaxonomyChip } from "@/components/board/taxonomy-tags";
import { m } from "#/paraglide/messages";

/**
 * The jobs listing rail's "Related searches" heading — the operator override
 * (`jobCardLabels.relatedSearchesTitle`, the same field the hosted board reads)
 * when set, else the localized Paraglide default. Replaces the programmatic
 * view's old hardcoded English `"Related Searches"` fallback.
 */
export function relatedSearchesTitle(labels?: BoardLabelOverrides): string {
  const override = labels?.jobCardLabels?.relatedSearchesTitle;
  return override && override.trim() !== "" ? override : m.jobCard_relatedSearchesTitle();
}

/**
 * Map the browse API's `RelatedSearch[]` (ADR-0037 §8 — jobs surface
 * `category`/`skill` terms, the companies list surfaces `market` terms) to the
 * crawlable `TaxonomyChip`s the listing rail renders. The href for each term
 * comes from the `@cavuno/board/paths` helper for its type — never a
 * hand-built path — so the rail's internal-linking spine matches the hosted
 * board, sitemap, and emails. Counts are intentionally dropped: the rail uses
 * the plain `TaxonomyTags` link idiom (no count badge), same as the job-detail
 * and salary taxonomy chips.
 */
export function relatedSearchesToChips(related: RelatedSearch[] | undefined): TaxonomyChip[] {
  return (related ?? []).map((r) => ({
    key: `${r.type}-${r.slug}`,
    name: r.term,
    href:
      r.type === "market"
        ? companyMarketPath(r.slug)
        : r.type === "skill"
          ? jobsSkillPath(r.slug)
          : jobsCategoryPath(r.slug),
  }));
}
