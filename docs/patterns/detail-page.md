---
name: Detail page
purpose: A single record shown as a full-bleed header band over a two-column body — prose main plus a sticky right rail.
primitives: [Page, Bleed, PageHeader, PageContent, JobDetail, Prose, Avatar, Badge, TaxonomyTags]
usedBy: [src/components/board/job-detail.tsx, src/routes/companies.$companySlug.index.tsx, src/routes/blog.$postSlug.tsx]
---

## Purpose

A single job, company, or post opens on a full-bleed gray header band
(breadcrumbs + title + meta), then drops into a two-column body: the sanitized
prose in the main column, a sticky action rail on the right. `PageContent`'s
named `aside` owns the canonical two-column geometry, so no page re-derives the
sticky-rail math. On mobile `asideOrder="before"` puts the primary CTA directly
under the header.

## When to use

- A single record with a primary action (apply, follow, read) and secondary
  context (salary, company, related items).
- **When NOT to use** — a searchable collection. That is the
  [Listing page](listing-page.md).

## Anatomy

- `Page` with a full-width `Bleed` header and `PageContent` with a named `aside`
  (switches the body to the two-column sticky grid).
- Header band: breadcrumbs → `Avatar` + name link → display title → meta `Badge`
  pills → posted date.
- Main column: sanitized-HTML prose in a `Prose` wrapper (the canonical
  rich-text primitive — `prose prose-uui max-w-none` on the Untitled UI type
  scale), facts (`<dl>`), `TaxonomyTags`, custom fields, related-record grid.
- Rail: the apply/action card on `rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary_alt`.

## Composition

The canonical assembly uses the Page family. `JobDetail` still produces the
same visible result through migration-only `PageBody`; migrate that internal
implementation without changing the domain component's public contract:

```tsx
<Page>
  <PageContent
    header={<Bleed><PageHeader title={vm.title} breadcrumb={breadcrumb}>…</PageHeader></Bleed>}
    aside={applyCard}
    asideLabel={vm.applyLabel}
    asideOrder="before"
  >
    {/* prose + facts + TaxonomyTags + similar jobs */}
  </PageContent>
</Page>
```

## Do / Don't

| Do | Don't |
|---|---|
| Use `PageContent`'s named `aside` for the sticky column. | Start new work on migration-only `PageBody`, or hand-roll the grid and sticky geometry in a route. |
| Render sanitized API HTML (`job.description`, `post.html`) as-is through `Prose`. | Interpolate other strings into `dangerouslySetInnerHTML`, or hand-roll a `prose` class set per surface. |
| Keep the job-detail `head()` meta + JobPosting JSON-LD in the route. | Move or drop the SEO contract. |

## Used by

- `JobDetail` — the domain-level detail assembly; its internal `PageBody` use is migration-only.
- `companies.$companySlug.index` — company profile (still hand-rolls part of the rail geometry).
- `blog.$postSlug` — article (a third variant of the same skeleton).
- `Prose` — the shared rich-text primitive backing every main-column body here (and reused off-pattern by `employers.companies.$slug.profile` and `legal-page`).

## Related

- [Breadcrumb](breadcrumb.md)
- [Board card](board-card.md)
- [Stat tile](stat-tile.md)
