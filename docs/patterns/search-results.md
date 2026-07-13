---
name: Search results
purpose: A progressively enhanced directory that keeps dense results and a decision-complete detail visible together on desktop.
primitives: [SearchResultsLayout, SearchResultsList, SearchResultDetail, SearchResultCard, AdRail]
usedBy: [src/components/search-results/search-results-layout.tsx, src/components/search-results/search-results-list.tsx, src/components/search-results/search-result-detail.tsx, src/components/search-results/search-result-card.tsx, src/components/search-results/ad-rail.tsx]
---

## Purpose

Search results give people a stable place to scan a directory and compare one
result without losing the list. At `md` and wider, a fixed master rail and fluid
detail pane scroll independently. Below `md`, only the result list is present;
the entity’s ordinary canonical link owns navigation to its full detail page.

## When to use

- Jobs, Companies, and Talent directories whose results open a canonical detail.
- **When NOT to use** — a collection without selectable detail. Use the
  [Listing page](listing-page.md) pattern instead.

## Anatomy

- `SearchResultsLayout` — the centered responsive frame and optional outer ad
  slots. Its core stays 72rem wide before advertising is allowed to appear.
- `SearchResultsList` — the named master region and list-scroll restoration seam.
- `SearchResultDetail` — the desktop-only named detail projection and its own
  scroll-restoration seam.
- `SearchResultCard` — compact hover, keyboard-focus, and persistent selected
  chrome around an entity-specific result.
- `AdRail` — an explicitly labelled, provider-neutral 160 × 600 seam. It is
  sticky only at very wide viewports and renders only when the caller supplies it.

## Composition

Entity components own the words and facts. The shared pattern owns only the
geometry and interaction chrome:

```tsx
<SearchResultsLayout
  startAd={startAd ? <AdRail label={startAdLabel}>{startAd}</AdRail> : undefined}
  list={
    <SearchResultsList label={resultsLabel} scrollRestorationId="jobs-list">
      {jobs.map((job) => (
        <JobSearchResult key={job.id} vm={job} selected={job.slug === selectedJob} />
      ))}
    </SearchResultsList>
  }
  detail={
    <SearchResultDetail label={selectedJobLabel} scrollRestorationId="job-detail">
      <JobSearchResultDetail job={selectedJob} />
    </SearchResultDetail>
  }
/>
```

The default independent-scroll height is `calc(100dvh - 12rem)`. A route with a
different sticky-header stack sets `--search-results-height` on the layout.

## Do / Don't

| Do                                                                  | Don't                                                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Keep every result’s primary activation as a real canonical anchor.  | Turn a result card into a JavaScript-only button or duplicate full detail in the list response. |
| Give list and detail scope-specific `scrollRestorationId` values.   | Share one scroll position between the two independently scrolling regions.                      |
| Supply entity-specific children and labels through the named slots. | Add a universal entity schema or a `type` switch to the shared layout.                          |
| Render `AdRail` only when real creative is available.               | Reserve empty ad columns or show advertising before 1600px compresses the core.                 |

## Used by

- `SearchResultsLayout` — responsive geometry and optional outer ad columns.
- `SearchResultsList` and `SearchResultDetail` — named, independently scrolling regions.
- `SearchResultCard` — shared result interaction chrome.
- `AdRail` — optional provider-neutral advertising seam.

## Related

- [Listing page](listing-page.md)
- [Detail page](detail-page.md)
- [Results header](results-header.md)
- [Pending / loading](pending-loading.md)
