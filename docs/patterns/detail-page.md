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
- Operator custom fields and collection selections are placed by size class
  (`src/board/detail-fields.ts`): short values join the facts, long and rich
  text get their own section after the description, images sit in the main
  column and files in a rail "Documents" list. Custom number fields skip
  digit grouping below 10,000, so a year reads "2016"; larger numbers keep
  the locale's grouping.
- A collection renders one of three ways, decided only by its shown
  entries (`collectionPresentation`):
  - **List** — any entry carries a public description (the default
    description field, or a job's own wording): logo or a neutral initial
    tile, bold title, the description clamped to two lines; no cards,
    borders or label/value rows.
  - **Logo tiles** — no description, and any entry has a logo (`logoUrl`):
    a muted rounded panel of equal-height `Card` tiles, each a large
    contained logo on a neutral square over the name; 4 columns on `lg`, 3
    on `md`, 2 on phones. An entry without a logo gets the same tile with
    its initial.
  - **Chips** — neither: name chips in the taxonomy's outline size, the
    same on the job and company pages.

  An entry's other fields — selects, numbers, rich text, references,
  per-selection details — never show and never change the presentation.
- Long collections preview, then expand in place: the first 6 list entries,
  12 tiles or 12 chips, then a "Show all N" / "Show fewer" button
  (`aria-expanded`, `aria-controls`). Hidden entries stay in the markup. The
  expanded view groups entries under subheadings by the collection's first
  single-valued categorising field: a single select (option label, option
  order) or a reference no entry uses more than once (referenced entry name,
  order of first appearance). Entries without a value close under "Other".
  With no such field the expanded view is the same flat list, tiles or
  chips; the collapsed preview is never grouped.
- Rail: the apply/action card on `rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary_alt`.

## Composition

The canonical assembly uses the Page family:

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
| Use `PageContent`'s named `aside` for the sticky column.                               | Hand-roll the grid and sticky geometry in a route.                                                       |
| Render sanitized API HTML (`job.description`, `post.html`) as-is through `Prose`.      | Interpolate other strings into `dangerouslySetInnerHTML`, or hand-roll a `prose` class set per surface. |
| Keep the job-detail `head()` meta + JobPosting JSON-LD in the route.                   | Move or drop the SEO contract.                                                                          |
| Let the root shell render the one visible breadcrumb above the footer.                | Add another breadcrumb inside the detail hero or prose column.                                          |
| Reuse one profile-content projection in search detail and the canonical profile route. | Fork public profile fields or invent Message, Save, or Contact actions the API does not support.        |

## Used by

- `JobDetail` — the domain-level detail assembly.
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
