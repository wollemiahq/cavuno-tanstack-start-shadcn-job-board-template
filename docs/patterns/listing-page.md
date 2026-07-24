---
name: Listing page
purpose: The canonical search/filter → contextual results heading → collection → pagination browse surface.
primitives: [Page, PageContent, JobsFilterControls, SearchResultsLayout, JobsResultsBar, JobList, ListingPagination]
usedBy: [src/components/board/home-landing.tsx, src/components/board/job-search-page.tsx, src/routes/-programmatic-jobs-view.tsx, src/routes/index.tsx, src/routes/jobs.index.tsx, src/routes/jobs.$keyword.tsx, src/routes/jobs.locations.$location.index.tsx, src/routes/jobs.skills.$skill.tsx, src/routes/companies.$companySlug.jobs.index.tsx, src/routes/blog.index.tsx]
---

## Purpose

Collection surfaces that do not need a selectable desktop detail may open with
a full-bleed introduction and then a constrained results region. `Page` owns the
width, `Bleed` creates the band, `PageHeader` owns the introduction, and
`PageContent` owns the results and optional rail. Selectable job, company, and
talent directories use the sibling [Search results](search-results.md) pattern.
Jobs deliberately use its denser LinkedIn-style variant: keyword and location
live in the global header, a filter strip follows immediately, and the
contextual result count is the only `h1`—there is no second search or hero.
Companies, Talent, and Blog also delegate keyword search to the global header;
their page bodies start with collection-specific filters or content.

## When to use

- Any page that lists a paginated collection the visitor can search or filter.
- **When NOT to use** — a directory whose result opens an in-place desktop
  detail. Use the [Search results](search-results.md) pattern.
- **When NOT to use** — a single record (a job, a company profile, a post). That
  is the [Detail page](detail-page.md) pattern.

## Anatomy

- `Page` + `PageContent` — canonical width, gutters, vertical rhythm, and the
  optional named rail.
- `Bleed` + `PageHeader` — the full-width band: an optional `eyebrow` above
  the title (the home landing's honest job-count `Badge`; absent on the plain
  listing pages), display `h1`, optional subtitle, and a `search` slot.
- `ListingSearchBand` — the white rounded search panel inside the band (keyword
  input + Search button, with `leadingSlot` / `trailingSlot` / `belowSlot` for
  surface-specific controls).
- `JobsResultsBar` — the contextual result-count `h1`, optional honest range,
  and sort row (see [Results header](results-header.md)).
- Zero Jobs results — the same results bar followed by a centered `Empty` over
  the complete results width, with no master-detail grid.
- `JobList` — the rows/grid of `JobCard`s (or `CompanyCard`s / `PostCard`s on
  sibling surfaces).
- `ListingPagination` — the one page-based nav, composed from the owned shadcn
  Pagination primitives.

## Composition

The canonical assembly uses the Page family. Job listing routes delegate to
`JobSearchPage` through `ProgrammaticJobsView`, so jobs have one search-results
system rather than parallel route shells:

```tsx
<Page width="wide">
  <main>
    <JobsFilterControls filters={filters} … />
    <SearchResultsLayout
      list={
        <SearchResultsList label={resultsLabel}>
          <JobsResultsBar count={count} heading={heading} sort={filters.sort} … />
          {jobs.map((job) => <JobSearchResult key={job.id} vm={job} … />)}
          <ListingPagination … />
        </SearchResultsList>
      }
      detail={<SearchResultDetail label={detailLabel}>{detail}</SearchResultDetail>}
    />
  </main>
</Page>
```

## Do / Don't

| Do                                                                                     | Don't                                                                                        |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Keep contextual search in the global header; Jobs pairs keyword and location.             | Add a second page search form or a large hero between filters and results.                 |
| Promote the contextual result count to the one Jobs `h1`.                              | Repeat a generic “Jobs” page title above the working results surface.                         |
| Delegate job listings to `JobSearchPage`; `ProgrammaticJobsView` is the route adapter. | Add another job-listing shell or fork search behavior per SEO route.                         |
| Remove the master-detail grid when there are no Jobs results.                          | Reserve a blank detail pane beside an empty result list.                                      |

## Used by

- `HomeLanding` — the home `/` landing opens with this pattern's hero via the
  shared `band` (with the optional `eyebrow` job-count Badge + the same
  `JobsSearchControls` search that hands off to `/jobs`), then previews the
  board's collections below it as [Section heading](section-heading.md) rows of
  the shared cards (latest jobs, companies, blog, talent) and closes with a
  dual-path sign-up band. It is a landing, not a paginated result set — no
  results bar or pagination.
- `JobSearchPage` — `jobs.index`; the header owns keyword/location search and
  this page owns filters, the contextual count heading, cards, and detail.
- `ProgrammaticJobsView` — `jobs.$keyword`, `jobs.locations.*`, `jobs.skills.*`.
- `companies.index` and `companies.markets.$market` deliberately use the
  sibling [Search results](search-results.md) pattern instead.
- `companies.$companySlug.jobs.index` — the company-jobs subpage. Its hero is
  the shared [Company section](company-section.md) shell header (not
  a second centered header band — the two would double up), but it still
  composes this pattern's search + results primitives below that header: the
  shared `ListingSearchBand` (via `CompanyJobsSearchBar`), the honest count, the
  `JobList`, and `ListingPagination`.
- `blog.index`, `blog.tag.$tagSlug`, and `blog.author.$authorSlug` — the shared
  `BlogArchivePage` Page-family presentation. Blog cursors remain opaque URL
  cursors and render as crawlable “Next results” links, not page numbers. The
  global header owns Blog keyword search and submits to `/blog?q=`.

## Related

- [Results header](results-header.md)
- [Board card](board-card.md)
- [Empty state](empty-state.md)
- [Alert capture](alert-capture.md)
