---
name: Company section
purpose: A company's three public surfaces — profile, jobs, salaries — read as ONE entity behind a shared header with tab navigation.
primitives: [PageBody, Avatar, Badge, Link, Breadcrumb]
usedBy: [src/components/board/company-section-header.tsx, src/routes/companies.$companySlug.index.tsx, src/routes/companies.$companySlug.jobs.index.tsx, src/routes/companies.$companySlug.salaries.index.tsx]
---

## Purpose

A company is one entity with three public surfaces: its profile
(`/companies/:slug`), the jobs subpage (`…/jobs`), and the salary overview
(`…/salaries` + category pages). They must not read as three unrelated pages.
The **company section shell** (`CompanySectionShell`) opens every one of them
with a byte-identical header — the breadcrumb, the company mark + name (H1) +
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

`CompanySectionShell` wraps `PageBody` and renders, top to bottom:

- The **breadcrumb**, seated through `PageBody`'s `breadcrumb` slot (the ONE
  sanctioned placement — the shell passes resolved `BreadcrumbData`, never
  hand-placed trail markup). See the codified rule below.
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

### Codified design rule — "the trail locates the entity; the tabs navigate within it"

Baked in verbatim from the operator design review:

> On company section pages the visible breadcrumb ends at the ENTITY — Home →
> Companies → {Company} — and is IDENTICAL across all three tabs. NEVER append
> the section as a final crumb (no "… → Anduril → Jobs"). The tab row alone
> communicates which section you're in. The `BreadcrumbList` JSON-LD must match
> the visible trail (the pairing rule). The company name appearing both in the
> crumb and as the header H1 is correct (crumb = link, H1 = identity) — do not
> try to dedupe that. This rule generalises to any future tabbed entity page.

## Composition

`CompanySectionShell` is the canonical assembly — one `PageBody` with the
breadcrumb slot, the shared header, the tab row, then the section content:

```tsx
<CompanySectionShell
  breadcrumb={{ ariaLabel, items: [home, companies, { name: company.name }] }}
  company={company}            // name, slug, logoUrl, description
  activeSection="jobs"          // derived from the current route
  jobCount={company.publishedJobCount}
  hasSalaries={hasSalaries}     // gates the Salaries tab
>
  {/* per-section content — search band + results, or salary cards, … */}
</CompanySectionShell>
```

The tabs carry the vendored Untitled UI underline-tab VISUAL (`application/tabs`,
`type="underline"`) on real router-seam `Link` anchors — NOT the react-aria
`Tabs` component, whose `role="tab"` triggers over JS-only `TabPanel`s emit no
`<a href>` and would break the crawlable section-nav spine (the same role=grid
trap `TaxonomyTags` documents for `Tag`).

## Do / Don't

| Do | Don't |
|---|---|
| End the breadcrumb at the entity — Home → Companies → {Company} — identical on all three tabs, with the matching `BreadcrumbList` JSON-LD. | Append the section as a final crumb (`… → Anduril → Jobs`) or diverge the visible trail from its JSON-LD. |
| Seat the trail through `PageBody`'s `breadcrumb` slot; pass resolved `BreadcrumbData`. | Hand-place the trail element or its placement primitive in the shell / a route (the pattern-contract gate fails on it). |
| Render the tabs as real `Link` anchors with the UUI underline visual; active = unlinked `aria-current`. | Use the react-aria `Tabs` component (role=tab + JS panels, no crawlable `<a href>`). |
| Show the Jobs count Badge and gate the Salaries tab on real salary data (`getCompanySalaryPresence`). | Render a dead Salaries tab for a company with no salary data. |
| On the jobs subpage let the shell header BE the hero and keep the search band below it. | Double up a centered `ListingPageHeader` hero above the shell header. |

## Used by

- `board/company-section-header.tsx` — `CompanySectionShell` (the shell +
  the tab row).
- `routes/companies.$companySlug.index` — the profile (Overview tab): the
  sticky facts rail + description + 6-job preview below the shell.
- `routes/companies.$companySlug.jobs.index` — the jobs subpage (Jobs tab): the
  search band + honest count + results + pagination below the shell (the shell
  header replaces the former `ListingPageHeader` band).
- `routes/companies.$companySlug.salaries.index` — the salary overview
  (Salaries tab): the salary cards + rails + FAQ below the shell.

## Related

- [Breadcrumb](breadcrumb.md)
- [Detail page](detail-page.md)
- [Listing page](listing-page.md)
