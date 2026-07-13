---
name: Results header
purpose: The honest "Showing X–Y of Z" count and sort control on a single row above the results.
primitives: [JobsResultsBar, Select]
usedBy: [src/components/board/jobs-results-bar.tsx, src/components/board/job-search-page.tsx, src/components/programmatic-jobs-view.tsx]
---

## Purpose

Directly above the card grid sits one row: the honest total-result count on the
left, the sort control on the right. The count is range-aware — it renders
"Showing 1–20 of 340" when paginated, "1 result" / "340 results" otherwise —
and localizes through the Paraglide message seam. `JobsResultsBar` is the single
home of that count arithmetic.

## When to use

- Any listing surface that shows a paginated result set and a sort control.
- **When NOT to use** — a static section on the home or a detail page; those use
  a [Section heading](section-heading.md), not a result-count row.

## Anatomy

- A flex row with a bottom hairline (`border-b border-secondary pb-4`).
- Left: `<p>` with the localized count label.
- Right: the Untitled UI `Select` bound to `ListingFilters["sort"]`.

## Composition

The count arithmetic lives entirely inside `JobsResultsBar`; routes pass raw
`count` / `page` / `pageSize` and never compute the range themselves:

```tsx
const showRange =
  typeof count === "number" && typeof page === "number" &&
  typeof pageSize === "number" && count > pageSize;
const countLabel = showRange
  ? m.jobSearch_resultsShowingRange({ from, to, count })
  : count === 1
    ? m.jobSearch_resultsCountOne({ count })
    : m.jobSearch_resultsCountMany({ count });
```

## Do / Don't

| Do | Don't |
|---|---|
| Render `JobsResultsBar` and pass raw `count` / `page` / `pageSize`. | Inline the `resultsShowingRange` / `resultsCount*` math into a route (the pre-CAV-502 `companies/…/jobs` drift — that route was removed and the message keys are now referenced only inside `jobs-results-bar.tsx`). |
| Route sort edits back through `onSortChange` with the same sort enum the URL carries. | Build a second sort dropdown buried in a filter bar. |

## Used by

- `JobsResultsBar` — the primitive.
- `JobSearchPage` and `ProgrammaticJobsView` — the two listing shells consume it.

## Related

- [Listing page](listing-page.md)
- [Section heading](section-heading.md)
