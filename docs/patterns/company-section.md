---
name: Company section
purpose: A company's three public surfaces — profile, jobs, salaries — read as ONE entity behind a shared header with tab navigation.
primitives: [Page, PageHeader, PageContent, PageSection, Avatar, Badge, Link]
usedBy: [src/components/board/company-section-header.tsx, src/routes/companies.$companySlug.index.tsx, src/routes/companies.$companySlug.jobs.index.tsx, src/routes/companies.$companySlug.salaries.index.tsx]
---

## Purpose

A company is one entity with three public surfaces: its profile
(`/companies/:slug`), the jobs subpage (`…/jobs`), and the salary overview
(`…/salaries` + category pages). They must not read as three unrelated pages.
The **company section shell** (`CompanySectionShell`) opens every one of them
with a byte-identical header — the company mark + name (H1) +
one-line description, then a row of section tabs — so the visitor always knows
they are inside the same company, and can move between its sections in one
click. Only the content BELOW the tabs changes per surface.

## When to use

- A **multi-surface entity**: one record whose public presence spans several
  indexable sub-pages that share an identity header and cross-link as siblings
  (today: companies; the rule generalises to any future tabbed entity, e.g.
  talent profiles).
- **When NOT to use** — a single-surface record with no sibling sections (a
  job, a blog post): that is the [Detail page](detail-page.md). A bare searchable
  collection with no owning entity is the [Listing page](listing-page.md).

## Anatomy

The canonical anatomy is `Page` → `PageContent`, with the shared identity in
`PageHeader` and each tab's body grouped by `PageSection`. The existing
`CompanySectionShell` preserves that visible anatomy while it remains on the
migration-only `PageBody` internally. New route composition must not consume
`PageBody` directly.

- The root shell's bottom breadcrumb locates the current company section. The
  company shell never hand-places trail markup.
- The **header block** — `Avatar` (logo / initials) + the company name as the
  page `h1` + a tag-stripped, one-line-clamped description. This block is
  byte-identical across the three sections.
- The **tab row** — Overview / Jobs / Salaries as real crawlable anchors (see
  Do / Don't). The active tab is the current, unlinked `aria-current` label; the
  Jobs tab carries the honest company job count as a `Badge`; the Salaries tab
  renders ONLY when the company has salary data.
- `children` — the per-section content below the tabs (the profile rail +
  description + jobs preview; the jobs search band + results + pagination; the
  salary cards + rails + FAQ).

### Codified design rule — the shell locates the page; the tabs navigate the entity

Baked in verbatim from the operator design review:

The page trail is rendered once by the root shell above the footer. The tabs
remain the immediate navigation between Overview, Jobs, and Salaries; they are
not duplicated by another breadcrumb inside the company band.

## Composition

`CompanySectionShell` is the domain assembly: it owns the shared header, tab
row, and section content. Its current internal use of
`PageBody` is a migration detail, not a public composition recommendation:

```tsx
<CompanySectionShell
  company={company}            // name, slug, logoUrl, description
  activeSection="jobs"          // derived from the current route
  jobCount={company.publishedJobCount}
  hasSalaries={hasSalaries}     // gates the Salaries tab
>
  {/* per-section content — search band + results, or salary cards, … */}
</CompanySectionShell>
```

The section navigation is an app-level composition of typed router `Link`
anchors, shadcn `Badge`, and semantic `border-foreground`, `text-foreground`,
and `text-muted-foreground` tokens. It deliberately does not use the shadcn
`Tabs` primitive: these controls navigate to separately indexable pages rather
than switching panels in the current document, so they must remain crawlable
`<a href>` links. The active section is an unlinked `aria-current="page"` label.

## Do / Don't

| Do | Don't |
|---|---|
| Let the root shell own the one visible breadcrumb above the footer. | Hand-place a second trail inside the company band. |
| Render section navigation as real `Link` anchors using semantic theme tokens; active = unlinked `aria-current="page"`. | Use the shadcn `Tabs` component for navigation between separately indexable routes. |
| Show the Jobs count Badge and gate the Salaries tab on real salary data (`getCompanySalaryPresence`). | Render a dead Salaries tab for a company with no salary data. |
| On the jobs subpage let the shell header BE the hero and keep the search band below it. | Double up a second page header above the shell header. |

## Used by

- `board/company-section-header.tsx` — `CompanySectionShell` (the shell +
  the tab row).
- `routes/companies.$companySlug.index` — the profile (Overview tab): the
  sticky facts rail + description + 6-job preview below the shell.
- `routes/companies.$companySlug.jobs.index` — the jobs subpage (Jobs tab): the
  search band + honest count + results + pagination below the shell (the shell
  header replaces the former migration-only listing-header band).
- `routes/companies.$companySlug.salaries.index` — the salary overview
  (Salaries tab): the salary cards + rails + FAQ below the shell.

## Related

- [Breadcrumb](breadcrumb.md)
- [Detail page](detail-page.md)
- [Listing page](listing-page.md)
