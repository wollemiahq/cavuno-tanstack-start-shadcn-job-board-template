---
name: Listing page
purpose: The full-bleed header + search → results bar → list/grid → pagination browse surface every collection page shares.
primitives: [Page, Bleed, PageHeader, PageContent, PageSection, ListingSearchBand, JobsResultsBar, JobList, ListingPagination]
usedBy: [src/components/board/home-landing.tsx, src/components/board/job-search-page.tsx, src/components/programmatic-jobs-view.tsx, src/routes/index.tsx, src/routes/jobs.index.tsx, src/routes/jobs.$keyword.tsx, src/routes/jobs.locations.$location.index.tsx, src/routes/jobs.skills.$skill.tsx, src/routes/companies.$companySlug.jobs.index.tsx, src/routes/blog.index.tsx]
---

## Purpose

Collection surfaces that do not need a selectable desktop detail open the same way: a
soft-gray full-bleed band carrying a centered display title, an optional
one-line subtitle, and the page's search living inside the band, followed by a
constrained results region. `Page` owns the width, `Bleed` creates the band,
`PageHeader` owns the introduction, and `PageContent` owns the results and
optional rail. `ListingSearchBand` remains the shared search panel. Selectable
job and company directories use the sibling [Search results](search-results.md)
pattern while retaining the same Page and search-control vocabulary.

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
- `JobsResultsBar` — the honest "Showing X–Y of Z" count + sort row (see
  [Results header](results-header.md)).
- `JobList` — the rows/grid of `JobCard`s (or `CompanyCard`s / `PostCard`s on
  sibling surfaces).
- `ListingPagination` — the page-based nav.

## Composition

The canonical assembly uses the Page family. Job listing routes delegate to
`JobSearchPage` through `ProgrammaticJobsView`, so jobs have one search-results
system rather than parallel route shells:

```tsx
<Page>
  <PageContent
    header={
      <Bleed>
        <PageHeader title={heading ?? copy.jobSearch.headingJobs} description={m.jobsHero_subtitle()}>
          <JobsSearchControls filters={filters} … />
        </PageHeader>
      </Bleed>
    }
    aside={rail}
    asideLabel={relatedSearchesTitle}
  >
    <JobsResultsBar count={count} page={page} pageSize={pageSize} sort={filters.sort} … />
    <JobList jobs={jobs} language={language} labels={labels} variant="rows" />
    <ListingPagination page={page} count={count ?? 0} pageSize={pageSize} onPageChange={onPageChange} />
  </PageContent>
</Page>
```

## Do / Don't

| Do                                                                                     | Don't                                                                                        |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Compose `Page` → `PageContent`, using `Bleed` + `PageHeader` for the band.             | Start new work on migration-only `PageBody` / `ListingPageHeader`, or hand-roll a container. |
| Feed search through `ListingSearchBand` so all three headers stay identical.           | Write bespoke search markup — the shared band exists precisely to stop this.                 |
| Delegate job listings to `JobSearchPage`; `ProgrammaticJobsView` is the route adapter. | Add another job-listing shell or fork search behavior per SEO route.                         |

## Used by

- `HomeLanding` — the home `/` landing opens with this pattern's hero via the
  shared `band` (with the optional `eyebrow` job-count Badge + the same
  `JobsSearchControls` search that hands off to `/jobs`), then previews the
  board's collections below it as [Section heading](section-heading.md) rows of
  the shared cards (latest jobs, companies, blog, talent) and closes with a
  dual-path sign-up band. It is a landing, not a paginated result set — no
  results bar or pagination.
- `JobSearchPage` — `jobs.index`.
- `ProgrammaticJobsView` — `jobs.$keyword`, `jobs.locations.*`, `jobs.skills.*`.
- `companies.index` and `companies.markets.$market` deliberately use the
  sibling [Search results](search-results.md) pattern instead.
- `companies.$companySlug.jobs.index` — the company-jobs subpage. As of CAV-512
  its hero is the shared [Company section](company-section.md) shell header (not
  a second centered header band — the two would double up), but it still
  composes this pattern's search + results primitives below that header: the
  shared `ListingSearchBand` (via `CompanyJobsSearchBar`), the honest count, the
  `JobList`, and `ListingPagination`.
- `blog.index` — existing migration-only listing shell.

## Related

- [Results header](results-header.md)
- [Board card](board-card.md)
- [Empty state](empty-state.md)
- [Alert capture](alert-capture.md)
