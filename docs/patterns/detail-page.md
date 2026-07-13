---
name: Detail page
purpose: A single record shown as a full-bleed header band over a two-column body — prose main plus a sticky right rail.
primitives: [PageBody, JobDetail, Prose, Avatar, Badge, TaxonomyTags]
usedBy: [src/components/board/job-detail.tsx, src/routes/companies.$companySlug.index.tsx, src/routes/blog.$postSlug.tsx]
---

## Purpose

A single job, company, or post opens on a full-bleed gray header band
(breadcrumbs + title + meta), then drops into a two-column body: the sanitized
prose in the main column, a sticky action rail on the right. `PageBody`'s `rail`
slot owns the canonical `[1fr_20rem]` grid and the `lg:sticky lg:top-8`
geometry, so no page re-derives the sticky-rail math. On mobile the rail stacks
first, putting the primary CTA directly under the header.

## When to use

- A single record with a primary action (apply, follow, read) and secondary
  context (salary, company, related items).
- **When NOT to use** — a searchable collection. That is the
  [Listing page](listing-page.md).

## Anatomy

- `PageBody` with a `band` (full-bleed `bg-secondary` header) and a `rail`
  (switches the body to the two-column sticky grid).
- Header band: breadcrumbs → `Avatar` + name link → display title → meta `Badge`
  pills → posted date.
- Main column: sanitized-HTML prose in a `Prose` wrapper (the canonical
  rich-text primitive — `prose prose-uui max-w-none` on the Untitled UI type
  scale), facts (`<dl>`), `TaxonomyTags`, custom fields, related-record grid.
- Rail: the apply/action card on `rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary_alt`.

## Composition

`JobDetail` is the canonical assembly — `PageBody` with a `band` and the sticky
`rail` carrying the apply card:

```tsx
<PageBody
  band={
    <div className="border-b border-secondary bg-secondary">
      <div className="mx-auto flex w-full max-w-container flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <Breadcrumbs items={vm.breadcrumbs} ariaLabel={vm.breadcrumbAriaLabel} />
        <header className="flex flex-col gap-4">…</header>
      </div>
    </div>
  }
  rail={applyCard}
>
  {/* prose + facts + TaxonomyTags + similar jobs */}
</PageBody>
```

## Do / Don't

| Do | Don't |
|---|---|
| Use `PageBody`'s `rail` slot for the sticky column. | Hand-roll `grid lg:grid-cols-[1fr_20rem]` + `lg:sticky lg:top-8` in a route (`companies.$companySlug.index` and `blog.$postSlug` still re-derive parts of this skeleton — fold them onto `PageBody rail`). |
| Render sanitized API HTML (`job.description`, `post.html`) as-is through `Prose`. | Interpolate other strings into `dangerouslySetInnerHTML`, or hand-roll a `prose` class set per surface. |
| Keep the job-detail `head()` meta + JobPosting JSON-LD in the route. | Move or drop the SEO contract. |

## Used by

- `JobDetail` — the canonical detail page.
- `companies.$companySlug.index` — company profile (still hand-rolls part of the rail geometry).
- `blog.$postSlug` — article (a third variant of the same skeleton).
- `Prose` — the shared rich-text primitive backing every main-column body here (and reused off-pattern by `employers.companies.$slug.profile` and `legal-page`).

## Related

- [Breadcrumb](breadcrumb.md)
- [Board card](board-card.md)
- [Stat tile](stat-tile.md)
