---
name: Detail page
purpose: A canonical single-record page with a page header and decision-complete content, optionally paired with a sticky action rail.
primitives: [Page, Bleed, PageHeader, PageContent, JobDetail, TalentProfileContent, Prose, Avatar, Badge, TaxonomyTags]
usedBy: [src/components/board/job-detail.tsx, src/components/board/talent-profile-content.tsx, src/routes/p.$handle.tsx, src/routes/companies.$companySlug.index.tsx, src/routes/blog.$postSlug.tsx]
---

## Purpose

A single job, company, public profile, or post opens on a clear page header
(identity + title + meta), then drops into a two-column body: the sanitized
prose in the main column, a sticky action rail on the right. `PageContent`'s
named `aside` owns the canonical two-column geometry, so no page re-derives the
sticky-rail math. On mobile `asideOrder="before"` puts the primary CTA directly
under the header.

## When to use

- A single record with a primary action (apply, follow, read) and secondary
  context (salary, company, related items).
- A public profile whose canonical URL must remain complete when opened from a
  master–detail search in a new tab or on mobile.
- **When NOT to use** — a searchable collection. That is the
  [Listing page](listing-page.md).

## Anatomy

- `Page` with a full-width `Bleed` header and `PageContent` with a named `aside`
  (switches the body to the two-column sticky grid).
- Header band: `Avatar` + name link → display title → meta `Badge`
  pills → posted date.
- Main column: sanitized HTML in the canonical `Prose` wrapper
  (`typeset typeset-content`), facts (`<dl>`), `TaxonomyTags`, custom fields,
  and related-record grids.
- Rail: the apply/action card on `rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary_alt`.

## Composition

The canonical assembly uses the Page family. `JobDetail` still produces the
same visible result through migration-only `PageBody`; migrate that internal
implementation without changing the domain component's public contract:

```tsx
<Page>
  <PageContent
    header={
      <Bleed>
        <PageHeader title={vm.title}>
          …
        </PageHeader>
      </Bleed>
    }
    aside={applyCard}
    asideLabel={vm.applyLabel}
    asideOrder="before"
  >
    {/* prose + facts + TaxonomyTags + similar jobs */}
  </PageContent>
</Page>
```

## Do / Don't

| Do                                                                                     | Don't                                                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Use `PageContent`'s named `aside` for the sticky column.                               | Start new work on migration-only `PageBody`, or hand-roll the grid and sticky geometry in a route.      |
| Render sanitized API HTML (`job.description`, `post.html`) as-is through `Prose`.      | Interpolate other strings into `dangerouslySetInnerHTML`, or hand-roll a `prose` class set per surface. |
| Keep the job-detail `head()` meta + JobPosting JSON-LD in the route.                   | Move or drop the SEO contract.                                                                          |
| Let the root shell render the one visible breadcrumb above the footer.                | Add another breadcrumb inside the detail hero or prose column.                                          |
| Reuse one profile-content projection in search detail and the canonical profile route. | Fork public profile fields or invent Message, Save, or Contact actions the API does not support.        |

## Used by

- `JobDetail` — the domain-level detail assembly; its internal `PageBody` use is migration-only.
- `companies.$companySlug.index` — company profile (still hand-rolls part of the rail geometry).
- `blog.$postSlug` — complete Page-family article with an internal table of
  contents and author rail; it still has one `PageContent` main landmark.
- `TalentProfileContent` and `p.$handle` — one rich public profile projection
  with locale-aware dates, supported experience/education fields, and
  ProfilePage/Person JSON-LD on its canonical route.
- `Prose` — the shared rich-text primitive backing every main-column body here (and reused off-pattern by `employers.companies.$slug.profile` and `legal-page`).

## Related

- [Breadcrumb](breadcrumb.md)
- [Board card](board-card.md)
- [Stat tile](stat-tile.md)
