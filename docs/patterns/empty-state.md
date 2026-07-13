---
name: Empty state
purpose: The zero-results / not-found treatment — a featured icon, title, and description, kept inside the page chrome.
primitives: [Empty, EmptyState, FeaturedIcon, JobsNotFound, SalaryEmptyState]
usedBy: [src/components/board/home-landing.tsx, src/components/board/jobs-not-found.tsx, src/components/board/salary-sections.tsx, src/components/board/company-search-page.tsx, src/routes/companies.markets.$market.tsx, src/routes/blog.index.tsx, src/routes/jobs.locations.index.tsx]
---

## Purpose

When a search returns nothing or a slug no longer resolves, the page shows a
centered empty-state compound — media, title, description, and optional actions
— rather than a bare paragraph. Critically, the not-found surface keeps the
page's own chrome (the listing header + a working search band) so a dead end is
a place to search again, not a wall.

## When to use

- Zero search results, an empty collection, or a not-resolving programmatic slug.
- **When NOT to use** — a form error or a transient failure; that is
  [Form feedback](form-feedback.md).

## Anatomy

- New Rhea surfaces use the owned shadcn `Empty` compound: `EmptyHeader` →
  `EmptyMedia` → `EmptyTitle` + `EmptyDescription`, with optional
  `EmptyContent` actions.
- Migration-only surfaces may retain the Untitled UI `EmptyState` compound:
  `EmptyState.Header` → `EmptyState.FeaturedIcon` → `EmptyState.Content`.
- For programmatic not-founds: composed through the owning listing or search
  pattern so search stays available (`JobsNotFound` and
  `ProgrammaticCompaniesView`).

## Composition

The homepage uses the owned Rhea compound directly:

```tsx
<PageSection ariaLabel={copy.home.latestJobs}>
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <Briefcase />
      </EmptyMedia>
      <EmptyTitle>{copy.home.noJobsTitle}</EmptyTitle>
      <EmptyDescription>{copy.home.noJobsDescription}</EmptyDescription>
    </EmptyHeader>
  </Empty>
</PageSection>
```

The migration-only `JobsNotFound` wrapper keeps the shared listing header and
puts the legacy `EmptyState` compound below it:

```tsx
<Page>
  <PageContent
    header={<PageHeader title={…}><ListingSearchBand … /></PageHeader>}
  >
    <EmptyState size="sm" className="py-12">
      <EmptyState.Header><EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" /></EmptyState.Header>
      <EmptyState.Content>
        <EmptyState.Title>{copy.jobSearch.headingJobs}</EmptyState.Title>
        <EmptyState.Description>{message}</EmptyState.Description>
      </EmptyState.Content>
    </EmptyState>
  </PageContent>
</Page>
```

## Do / Don't

| Do                                                                                                        | Don't                                                                                        |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Use owned shadcn `Empty` for new surfaces (or the existing `JobsNotFound` / `SalaryEmptyState` wrappers). | Hand-roll a `<p className="rounded-lg border border-dashed …">` message box.                 |
| Keep the listing header + search in a programmatic `notFoundComponent`.                                   | Drop the visitor onto a bare message with no way forward.                                    |
| Use semantic Rhea tokens on the empty surface.                                                            | Copy legacy styling from `untitled-ui/not-found.tsx`; migrate it when touching that surface. |

## Used by

- `HomeLanding` — owned shadcn `Empty` for the no-jobs starter state.
- `JobsNotFound` — programmatic jobs not-found (`jobs.$keyword`, `jobs.locations.*`).
- `SalaryEmptyState` — the salary family.
- `CompanySearchPage` — company zero-results state inside the master list;
  `companies.markets.$market` routes unknown markets through the same searchable shell.
- `EmptyState` directly — `blog.index`, `jobs.locations.index`, and the salary routes.

## Related

- [Listing page](listing-page.md)
- [Form feedback](form-feedback.md)
