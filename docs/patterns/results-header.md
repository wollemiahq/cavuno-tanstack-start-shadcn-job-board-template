---
name: Results header
purpose: The contextual results-count H1 and sort control on a single compact row above the results.
primitives: [JobsResultsBar, Select]
usedBy: [src/components/board/jobs-results-bar.tsx, src/components/board/job-search-page.tsx, src/routes/-programmatic-jobs-view.tsx]
---

## Purpose

Directly above the card grid sits one compact row: the page’s only `h1` on the
left and the sort control on the right. The heading combines the honest total
with route context — “340 jobs”, “340 Engineering jobs”, or “340 Jobs in
Sydney”. When paginated, the smaller supporting line remains range-aware
(“Showing 1–20 of 340”). Both strings localize through the Paraglide message
seam. `JobsResultsBar` is the single home of that arithmetic.

## When to use

- Any listing surface that shows a paginated result set and a sort control.
- **When NOT to use** — a static section on the home or a detail page; those use
  a [Section heading](section-heading.md), not a result-count row.

## Anatomy

- A flex row with a bottom hairline (`border-b border-border pb-4`).
- Left: one contextual `<h1>` and an optional small range label.
- Right: the owned shadcn `Select` bound to `ListingFilters["sort"]`.

## Composition

The count arithmetic lives entirely inside `JobsResultsBar`; routes pass raw
`count` / `page` / `pageSize` and never compute the range themselves:

```tsx
const showRange =
  typeof count === "number" && typeof page === "number" &&
  typeof pageSize === "number" && count > pageSize;
const totalLabel = heading
  ? m.jobSearch_contextualResultsHeading({ count, heading })
  : count === 1
    ? m.jobSearch_resultsCountOne({ count })
    : m.jobSearch_resultsCountMany({ count });
const rangeLabel = showRange
  ? m.jobSearch_resultsShowingRange({ from, to, count })
  : null;
```

## Do / Don't

| Do | Don't |
|---|---|
| Render `JobsResultsBar` and pass raw `count` / `page` / `pageSize`. | Inline the `resultsShowingRange` / `resultsCount*` math into a route. |
| Route sort edits back through `onSortChange` with the same sort enum the URL carries. | Build a second sort dropdown buried in a filter bar. |

## Used by

- `JobsResultsBar` — the primitive.
- `JobSearchPage` and `ProgrammaticJobsView` — the two listing shells consume it.

## Related

- [Listing page](listing-page.md)
- [Section heading](section-heading.md)
