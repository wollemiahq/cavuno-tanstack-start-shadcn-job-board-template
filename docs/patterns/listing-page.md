---
name: Listing page
purpose: The full-bleed header + search → results bar → list/grid → pagination browse surface every collection page shares.
primitives: [PageBody, ListingPageHeader, ListingSearchBand, JobsResultsBar, JobList, ListingPagination]
usedBy: [src/components/board/home-landing.tsx, src/components/board/job-search-page.tsx, src/components/programmatic-jobs-view.tsx, src/routes/index.tsx, src/routes/jobs.index.tsx, src/routes/jobs.$keyword.tsx, src/routes/jobs.locations.$location.index.tsx, src/routes/jobs.skills.$skill.tsx, src/routes/companies.index.tsx, src/routes/companies.markets.$market.tsx, src/routes/companies.$companySlug.jobs.index.tsx, src/routes/blog.index.tsx]
---

## Purpose

Every collection surface — jobs, companies, blog — opens the same way: a
soft-gray full-bleed band carrying a centered display title, an optional
one-line subtitle, and the page's search living inside the band, followed by a
constrained results region. `PageBody` owns the page width and vertical rhythm;
`ListingPageHeader` owns the band; `ListingSearchBand` owns the white search
panel. A visitor moving between /jobs, /companies, and /blog reads one system,
not three hand-rolled layouts.

## When to use

- Any page that lists a paginated collection the visitor can search or filter.
- **When NOT to use** — a single record (a job, a company profile, a post). That
  is the [Detail page](detail-page.md) pattern.

## Anatomy

- `PageBody` — canonical `max-w-container` width, padding, and `gap-8` rhythm;
  renders the `band` slot full-bleed above the constrained content.
- `ListingPageHeader` — the `bg-secondary` band: an optional `eyebrow` above
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

`JobSearchPage` is the canonical assembly — `PageBody` wrapping the shared band
and the constrained results region:

```tsx
<PageBody
  band={
    <ListingPageHeader
      title={heading ?? copy.jobSearch.headingJobs}
      subtitle={m.jobsHero_subtitle()}
      search={<JobsSearchControls filters={filters} … />}
    />
  }
>
  <JobsResultsBar count={count} page={page} pageSize={pageSize} sort={filters.sort} … />
  <JobList jobs={jobs} language={language} labels={labels} variant="rows" />
  <ListingPagination page={page} count={count ?? 0} pageSize={pageSize} onPageChange={onPageChange} />
</PageBody>
```

## Do / Don't

| Do | Don't |
|---|---|
| Wrap the page in `PageBody` and pass the header through the `band` slot. | Hand-roll a `max-w-*` container or a bespoke `<header>` (the pre-CAV-502 drift, now removed). |
| Feed search through `ListingSearchBand` so all three headers stay identical. | Write bespoke search markup — the shared band exists precisely to stop this. |
| Compose the existing `JobSearchPage` / `ProgrammaticJobsView` shell. | Add a **third** listing shell. `JobSearchPage` (jobs.index) and `ProgrammaticJobsView` (SEO listings) remain two parallel shells over the same primitives — the last structural duplication; do not grow it, and prefer folding new surfaces onto one of them. |

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
- `companies.index`, `companies.markets.$market` — `PageBody` + `ListingPageHeader` directly.
- `companies.$companySlug.jobs.index` — the company-jobs subpage. As of CAV-512
  its hero is the shared [Company section](company-section.md) shell header (not
  a centered `ListingPageHeader` band — the two would double up), but it still
  composes this pattern's search + results primitives below that header: the
  shared `ListingSearchBand` (via `CompanyJobsSearchBar`), the honest count, the
  `JobList`, and `ListingPagination`.
- `blog.index` — `PageBody` + `ListingPageHeader`.

## Related

- [Results header](results-header.md)
- [Board card](board-card.md)
- [Empty state](empty-state.md)
- [Alert capture](alert-capture.md)
