---
name: Listing rail
purpose: The sticky right-hand rail of a search/browse listing — an operator ad seam over a related-searches card.
primitives: [ListingRail, TaxonomyTags, PageBody]
usedBy: [src/components/board/listing-rail.tsx, src/components/board/job-search-page.tsx, src/components/programmatic-jobs-view.tsx, src/routes/companies.index.tsx]
---

## Purpose

A search/browse listing (the jobs search page, the programmatic jobs pages, the
companies index) puts its results in the left column and a **sticky rail** on
the right. The rail houses two things, top to bottom: an optional operator **ad
seam** and a **Related searches** card of crawlable taxonomy links. It turns the
dead right margin of a wide listing into an internal-linking + monetisation
surface without disturbing the results, pagination, or search band.

## When to use

- A **listing/browse surface with room for a rail** — jobs search (`/jobs`), the
  programmatic `/jobs/*` pages, and the companies index (`/companies`).
- **When NOT to use** — a detail page (that rail is the [Detail page](detail-page.md)
  apply/meta rail, not this one), or a listing with nothing to put in the rail
  (no ad unit and no related searches): let the results run full width rather
  than open a dead column.

## Anatomy

Rendered through `PageBody`'s existing `rail` slot (no new grid) — results left,
`ListingRail` in the sticky right `aside`, collapsing below the results on
mobile. Inside `ListingRail`, top to bottom:

- `adSlot` — the operator ad seam. Renders FIRST, and renders **nothing** when
  absent (no ad network ships in the template).
- The **Related searches** card — a ringed `bg-primary` surface with a heading
  and [Board card](board-card.md)-style `TaxonomyTags` links. Omitted when there
  are no chips.

## Composition

`board/listing-rail.tsx` is pure markup over resolved props; the caller maps its
`RelatedSearch[]` (or markets) to `{ key, name, href }` chips via
`@cavuno/board/paths` helpers (`src/board/related-searches.ts`), and
`railHasContent` decides whether the route hands `PageBody` a `rail` at all:

```tsx
const relatedChips = relatedSearchesToChips(relatedSearches);
const rail = railHasContent(adSlot, relatedChips) ? (
  <ListingRail adSlot={adSlot} relatedTitle={relatedSearchesTitle(labels)} relatedChips={relatedChips} />
) : undefined;

return <PageBody band={<ListingPageHeader … />} rail={rail}>{/* results */}</PageBody>;
```

```tsx
// ListingRail body
{adSlot}
{relatedChips.length > 0 ? (
  <section aria-label={relatedTitle} className="… rounded-xl bg-primary p-5 ring-1 ring-secondary_alt">
    <h2 className="text-sm font-semibold text-secondary">{relatedTitle}</h2>
    <TaxonomyTags chips={relatedChips} size="md" />
  </section>
) : null}
```

## Do / Don't

| Do | Don't |
|---|---|
| Render the rail via `PageBody`'s `rail` slot (results left, sticky rail right, stacks on mobile). | Hand-roll a second two-column grid — `PageBody` already owns it. |
| Put the ad seam FIRST and let it render nothing when absent. | Ship an ad-network dependency in the template — the seam is a wired-by-operator `ReactNode`. |
| Gate `rail` on `railHasContent` so an empty rail leaves no dead column. | Force two-column mode when there is no ad and no related searches. |
| Feed `TaxonomyTags` real `@cavuno/board/paths` hrefs (the crawlable internal-linking spine). | String-build `/jobs/…` or `/companies/markets/…` paths, or render the related searches at the page bottom. |

## Used by

- `board/listing-rail.tsx` — the composition (ad seam + related-searches card).
- `board/job-search-page.tsx` — the `/jobs` search surface.
- `programmatic-jobs-view.tsx` — the programmatic `/jobs/*` listings.
- `routes/companies.index.tsx` — the companies index (browse-by-market card).

## Related

- [Listing page](listing-page.md)
- [Board card](board-card.md)
- [Detail page](detail-page.md)
