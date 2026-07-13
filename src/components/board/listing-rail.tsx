import { TaxonomyTags, type TaxonomyChip } from "@/components/board/taxonomy-tags";

/**
 * Listing rail (CAV-511) — the sticky right-hand column of a search/browse
 * listing (jobs search, the programmatic jobs pages, companies index). It
 * seats, top to bottom:
 *
 *  1. An optional **operator ad seam** (`adSlot`). It renders FIRST and
 *     renders NOTHING when absent — no ad network ships in this template.
 *     An operator wires their own unit here without touching the layout, e.g.
 *
 *       <PageBody rail={<ListingRail adSlot={<MyAdUnit slot="listing-rail" />} … />}>
 *
 *  2. A **Related searches** card — the `relatedSearches` the browse API
 *     already returns (jobs: category/skill terms; companies: market terms),
 *     rendered as the same crawlable `TaxonomyTags` anchors used across the
 *     board (the SEO internal-linking spine, never static text). The card is
 *     omitted when there are no chips, so the rail stays honest.
 *
 * Pure markup over resolved props — the caller maps its `RelatedSearch[]` (or
 * markets) to `{ key, name, href }` chips via the `@cavuno/board/paths`
 * helpers, so this file never string-builds a path. `railHasContent` tells the
 * route whether to switch `PageBody` into two-column rail mode at all (an empty
 * rail must not leave a dead column).
 */
export function ListingRail({
  adSlot,
  relatedTitle,
  relatedChips,
}: {
  /** Operator ad unit — renders first; nothing when absent. */
  adSlot?: React.ReactNode;
  /** Heading for the related-searches card. */
  relatedTitle: string;
  /** Crawlable taxonomy links; the card is omitted when empty. */
  relatedChips: TaxonomyChip[];
}) {
  return (
    <>
      {adSlot}
      {relatedChips.length > 0 ? (
        <section
          aria-label={relatedTitle}
          className="flex flex-col gap-3 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary_alt"
        >
          <h2 className="text-sm font-semibold text-secondary">{relatedTitle}</h2>
          <TaxonomyTags chips={relatedChips} size="md" />
        </section>
      ) : null}
    </>
  );
}

/**
 * Whether the rail has anything to show — drives whether the route hands
 * `PageBody` a `rail` (two-column mode) or lets the results run full width.
 */
export function railHasContent(adSlot: React.ReactNode, relatedChips: TaxonomyChip[]) {
  return Boolean(adSlot) || relatedChips.length > 0;
}
