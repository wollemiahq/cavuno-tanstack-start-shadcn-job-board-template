---
name: Empty state
purpose: The zero-results / not-found treatment — a featured icon, title, and description, kept inside the page chrome.
primitives: [EmptyState, FeaturedIcon, JobsNotFound, SalaryEmptyState]
usedBy: [src/components/board/jobs-not-found.tsx, src/components/board/salary-sections.tsx, src/routes/companies.index.tsx, src/routes/blog.index.tsx, src/routes/jobs.locations.index.tsx]
---

## Purpose

When a search returns nothing or a slug no longer resolves, the page shows a
centered `EmptyState` — a `FeaturedIcon`, a title, and a description — rather
than a bare paragraph. Critically, the not-found surface keeps the page's own
chrome (the listing header + a working search band) so a dead end is a place to
search again, not a wall.

## When to use

- Zero search results, an empty collection, or a not-resolving programmatic slug.
- **When NOT to use** — a form error or a transient failure; that is
  [Form feedback](form-feedback.md).

## Anatomy

- The Untitled UI `EmptyState` compound: `EmptyState.Header` →
  `EmptyState.FeaturedIcon` → `EmptyState.Content` (`Title` + `Description`).
- For programmatic not-founds: wrapped in `PageBody` + `ListingPageHeader` +
  `ListingSearchBand` so the search stays available (`JobsNotFound`).

## Composition

`JobsNotFound` keeps the shared listing header and puts `EmptyState` below it:

```tsx
<PageBody band={<ListingPageHeader title={…} search={<ListingSearchBand … />} />}>
  <EmptyState size="sm" className="py-12">
    <EmptyState.Header><EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" /></EmptyState.Header>
    <EmptyState.Content>
      <EmptyState.Title>{copy.jobSearch.headingJobs}</EmptyState.Title>
      <EmptyState.Description>{message}</EmptyState.Description>
    </EmptyState.Content>
  </EmptyState>
</PageBody>
```

## Do / Don't

| Do | Don't |
|---|---|
| Use `EmptyState` (or `JobsNotFound` / `SalaryEmptyState` wrappers). | Hand-roll a `<p className="rounded-lg border border-dashed …">` message box. |
| Keep the listing header + search in a programmatic `notFoundComponent`. | Drop the visitor onto a bare message with no way forward. |
| Use UUI tokens on the empty surface. | Use legacy tokens — `untitled-ui/not-found.tsx` still uses `font-heading text-3xl`; migrate it. |

## Used by

- `JobsNotFound` — programmatic jobs not-found (`jobs.$keyword`, `jobs.locations.*`).
- `SalaryEmptyState` — the salary family.
- `EmptyState` directly — `companies.index`, `blog.index`, `jobs.locations.index`, and the salary routes.

## Related

- [Listing page](listing-page.md)
- [Form feedback](form-feedback.md)
