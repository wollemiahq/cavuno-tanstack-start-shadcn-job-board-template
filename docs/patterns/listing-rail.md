---
name: Listing rail
purpose: The listing surface's operator ad seam plus its crawlable related-searches links, seated around the results column.
primitives: [SearchResultsLayout, AdRail, Badge]
usedBy: [src/components/search-results/search-results-layout.tsx, src/components/search-results/ad-rail.tsx, src/components/board/job-search-page.tsx, src/components/board/company-search-page.tsx]
---

## Purpose

A search/browse listing (the jobs search page, the programmatic `/jobs/*`
pages, the companies index) turns the space around its results into two
operator seams: an optional **ad seam** and a **related-searches** internal-
linking surface. This keeps monetisation and SEO internal linking on a listing
without disturbing the results, pagination, or filter band.

## When to use

- A **listing/browse surface** — jobs search (`/jobs`), the programmatic
  `/jobs/*` pages, and the companies index (`/companies`).
- **When NOT to use** — a detail page (that rail is the [Detail page](detail-page.md)
  apply/meta rail, not this one). When there is no ad unit, let the ad column
  render nothing rather than open a dead margin.

## Anatomy

The listing is composed with `SearchResultsLayout` (results + selected-detail
columns). The two operator seams hang off it:

- The **ad seam** — `SearchResultsLayout`'s `startAd` / `endAd` slots, each an
  `AdRail`. `AdRail` renders FIRST/last and renders **nothing** when absent (no
  ad network ships in the template). An operator wires their own unit here
  without touching the layout.
- The **related-searches** links — rendered inline at the foot of the results
  list, as crawlable `Badge` anchors (jobs: category/skill terms via
  `relatedSearchesToChips`; companies: browse-by-market terms). The section is
  omitted when there are no chips, so the listing stays honest.

## Composition

`SearchResultsLayout` takes `startAd` / `endAd` / `list` / `detail` nodes; the
route hands it `AdRail` seams and the results list. The caller maps its
`RelatedSearch[]` (or markets) to `{ key, name, href }` chips via the
`@cavuno/board/paths` helpers (`src/board/related-searches.ts`), so this surface
never string-builds a path. The chips render as `Badge` anchors, and the whole
section is dropped when the chip list is empty.

```tsx
const relatedChips = relatedSearchesToChips(relatedSearches);

return (
  <SearchResultsLayout
    startAd={startAd ? <AdRail label={startAd.label}>{startAd.content}</AdRail> : undefined}
    endAd={endAd ? <AdRail label={endAd.label}>{endAd.content}</AdRail> : undefined}
    list={
      <SearchResultsList label={resultsLabel}>
        {/* results, pagination */}
        {relatedChips.length > 0 ? (
          <section aria-label={relatedSearchesTitle(labels)} className="border-border space-y-3 border-t pt-4">
            <h2 className="text-sm font-semibold">{relatedSearchesTitle(labels)}</h2>
            <div className="flex flex-wrap gap-1.5">
              {relatedChips.map((chip) => (
                <Badge key={chip.key} variant="outline" render={<a href={chip.href} />}>
                  {chip.name}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}
      </SearchResultsList>
    }
    detail={/* selected-result detail */}
  />
);
```

## Do / Don't

| Do | Don't |
|---|---|
| Compose the listing with `SearchResultsLayout`'s named slots. | Hand-roll a second two-column grid alongside it. |
| Put the ad seam in `startAd` / `endAd` and let `AdRail` render nothing when absent. | Ship an ad-network dependency in the template — the seam is a wired-by-operator `ReactNode`. |
| Drop the related-searches section when there are no chips. | Force an empty related-searches heading with no links under it. |
| Feed the chips real `@cavuno/board/paths` hrefs (the crawlable internal-linking spine). | String-build `/jobs/…` or `/companies/markets/…` paths, or bury the related searches below the fold. |

## Used by

- `search-results/search-results-layout.tsx` — the results + detail columns with the ad seams.
- `search-results/ad-rail.tsx` — the operator ad seam (renders nothing when absent).
- `board/job-search-page.tsx` — the `/jobs` search + programmatic listings (related-search chips).
- `board/company-search-page.tsx` — the `/companies` index (browse-by-market chips).

## Related

- [Listing page](listing-page.md)
- [Board card](board-card.md)
- [Detail page](detail-page.md)
