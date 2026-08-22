---
name: Empty state
purpose: The zero-results / not-found treatment — a featured icon, title, and description, kept inside the page chrome.
primitives: [EmptyState, Empty, JobsNotFound, SalaryEmptyState]
usedBy: [src/components/empty-state.tsx, src/components/alert-manager.tsx, src/routes/me.applications.tsx, src/routes/saved-jobs.tsx, src/routes/employers.companies.$slug.index.tsx, src/components/board/home-landing.tsx, src/components/board/jobs-not-found.tsx, src/components/board/salary-sections.tsx, src/components/board/company-search-page.tsx, src/components/board/talent-search-page.tsx, src/routes/talent.index.tsx, src/routes/p.$handle.tsx, src/routes/companies.markets.$market.tsx, src/routes/blog.index.tsx, src/routes/jobs.locations.index.tsx]
---

## Purpose

When a search returns nothing or a slug no longer resolves, the page shows a
centered empty-state compound — media, title, description, and optional actions
— rather than a bare paragraph. Critically, a search not-found surface keeps
the global contextual search and the page's filter chrome, so a dead end is a
place to revise or reset the search rather than a wall.

## When to use

- Zero search results, an empty collection, or a not-resolving programmatic slug.
- **When NOT to use** — a form error or a transient failure; that is
  [Form feedback](form-feedback.md).

## Anatomy

- **Page/collection empties** (no saved jobs, no applications, no job alerts,
  the employer's "no jobs") use the shared `EmptyState` wrapper
  (`src/components/empty-state.tsx`): one icon badge, title, description, and a
  single button action, in a consistent `min-h-96`. This is the standardized
  form — do not hand-roll the min-height, media size, or action styling per
  surface.
- New surfaces otherwise use the owned shadcn `Empty` compound:
  `EmptyHeader` → `EmptyMedia` → `EmptyTitle` + `EmptyDescription`, with
  optional `EmptyContent` actions. Multi-action access gates (the restricted
  talent directory) and full-canvas search not-found surfaces compose `Empty`
  directly rather than the single-action `EmptyState`.
- For programmatic not-founds: composed through the owning listing or search
  pattern so contextual search stays available (`JobsNotFound` and
  `ProgrammaticCompaniesView`).
- A job search with no results spans the full results canvas. It does not
  reserve an empty master-detail column or an empty advertising rail.

## Composition

The homepage uses the owned shadcn compound directly:

```tsx
<PageSection ariaLabel={copy.home.latestJobs}>
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <Search aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle role="heading" aria-level={2}>{m.home_emptyHeading()}</EmptyTitle>
      <EmptyDescription>{m.home_emptySupporting()}</EmptyDescription>
    </EmptyHeader>
  </Empty>
</PageSection>
```

`JobsNotFound` keeps the global search and route filters, then uses the complete
results width for one recovery action:

```tsx
<Page>
  <main>
    <JobsFilterControls … />
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon"><Search /></EmptyMedia>
        <h1>{copy.jobSearch.noMatchingResultsHeading}</h1>
        <EmptyDescription>{copy.jobSearch.queryEmptyText}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/jobs">{copy.jobSearch.resetFiltersAction}</Link>
      </EmptyContent>
    </Empty>
  </main>
</Page>
```

## Do / Don't

| Do                                                                                                        | Don't                                                                                        |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Use owned shadcn `Empty` for new surfaces (or the existing `JobsNotFound` / `SalaryEmptyState` wrappers). | Hand-roll a `<p className="rounded-lg border border-dashed …">` message box.                 |
| Keep contextual header search + page filters in a programmatic `notFoundComponent`.                       | Drop the visitor onto a bare message with no way forward.                                    |
| Describe the failed search and offer one primary reset action.                                            | Expose route concepts such as “skill not found” or “category not found” to visitors.         |
| Give a no-match state the complete results canvas.                                                        | Leave a blank detail column, divider, or advertising slot beside it.                          |
| Use the owned `Empty` compound and semantic tokens on the empty surface.                                  | Reintroduce retired styling or hand-roll a parallel empty-state system.                      |

## Used by

- `HomeLanding` — owned shadcn `Empty` for the no-jobs starter state.
- `JobsNotFound` — one search-focused programmatic jobs recovery state
  (`jobs.$keyword`, `jobs.locations.*`, and `jobs.skills.*`).
- `JobSearchPage` — full-width no-match recovery for ordinary `/jobs` search
  results; an unfiltered board with no open jobs keeps its honest collection-empty copy.
- `SalaryEmptyState` — the salary family.
- `CompanySearchPage` — company zero-results state inside the master list;
  `companies.markets.$market` routes unknown markets through the same searchable shell.
- `TalentSearchPage` — filtered and unfiltered Talent empty states inside the
  master list; disabled directories and missing public profiles use owned
  recovery actions rather than bare paragraphs.
- `BlogArchivePage` — blog, tag, and author zero-result recovery.
- `jobs.locations.index` — the location taxonomy’s honest empty collection.

## Related

- [Listing page](listing-page.md)
- [Form feedback](form-feedback.md)
