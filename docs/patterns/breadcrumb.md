---
name: Breadcrumb
purpose: The chevron-separated trail of ancestor links ending in the current page — the internal-linking + SEO spine back up the hierarchy.
primitives: [Breadcrumb, PageBreadcrumb, PageHeaderWithBreadcrumb, AriaLink]
usedBy: [src/components/board/breadcrumb.tsx, src/components/board/page-header-with-breadcrumb.tsx, src/components/board/page-body.tsx, src/components/board/listing-page-header.tsx, src/components/board/job-detail.tsx, src/components/board/job-search-page.tsx, src/components/board/talent-search-page.tsx, src/components/programmatic-jobs-view.tsx, src/routes/p.$handle.tsx, src/routes/blog.$postSlug.tsx, src/routes/blog.index.tsx, src/routes/blog.tag.$tagSlug.tsx, src/routes/blog.author.$authorSlug.tsx, src/routes/companies.index.tsx, src/routes/companies.$companySlug.index.tsx, src/routes/companies.markets.$market.tsx, src/routes/companies.$companySlug.jobs.index.tsx, src/routes/salaries.index.tsx]
---

## Purpose

Deep pages (a job, a salary page, a company profile, a blog post) open with a
breadcrumb trail: `ChevronRight`-separated ancestor links riding the router seam
as `AriaLink`, ending in the current page as `aria-current="page"` text. It is
the navigational and SEO spine back up the hierarchy, and — because every crumb
is a real link — the internal-linking rail crawlers follow into the hubs.

## When to use

- Every **indexable page below depth 1** — i.e. any page that has an ancestor
  hub, so its trail carries two or more crumbs (a job detail, a salary page, a
  company profile, the company jobs subpage, a market page, a blog post / tag /
  author, and the hub indexes themselves: `/blog`, `/companies`, `/salaries`).
- **Paired, always.** The visible trail and the `BreadcrumbList` JSON-LD are one
  unit: wherever a page renders the visible trail it also emits the matching
  `createBreadcrumbJsonLd` / `listingJsonLd` breadcrumb (same crumbs, same
  order, current page unlinked), and vice versa. Shipping one without the other
  is the drift this pattern guards against.
- **When NOT to use** — a single-crumb top-level surface (the `/` landing and
  `/jobs`, whose trail would be just "Jobs" — `createBreadcrumbJsonLd` returns
  `null` for it), and any **gated or shallow surface**: auth, account, employer
  dashboards, and the standalone legal pages. Those are not internal-linking
  targets, so they carry no trail.

## Anatomy

- **Placement is owned by one seam.** New compositions pass resolved data to
  `PageHeaderWithBreadcrumb`, which seats the trail before the constrained
  `PageHeader`; domain assemblies never hand-place trail markup. Existing routes still seat
  `PageBreadcrumb` through migration-only `PageBody` /
  `ListingPageHeader` slots or the `JobDetail` band until they move to the Page
  family. All paths render the same `Breadcrumb` markup, so the trail itself is
  never forked (`pattern-contract.test.ts` gates it).
- **Spacing** — `PageBreadcrumb` **hugs the top** at the codified `pt-4 md:pt-5`
  (compact, relative to the nav), identical on a band page and a band-less page.
  The generous whitespace lives BETWEEN the trail and the title/content, never
  above the trail. A crumb floating mid-band, pushed down by the hero's full top
  padding — or by the page container's `py-8` — is the drift this owns away: the
  trail anchors near the nav everywhere.
- **Alignment** — `PageBreadcrumb` is **left-aligned at the container edge**
  (`max-w-container` + the canonical horizontal padding). On a **centered** hero
  (companies / jobs / blog listing) the trail therefore stays left even though
  the title below is centered. Never center the trail.
- `<nav aria-label>` → `<ol className="flex flex-wrap items-center gap-1.5 text-sm">`.
- Each link: `AriaLink` with `text-tertiary hover:text-secondary`.
- Current page: `<span aria-current="page">` (unlinked).
- Separator: `ChevronRight` `text-fg-quaternary`.

## Composition

`board/breadcrumb.tsx` (`Breadcrumb`) is the **single** canonical primitive over
the `{ items, ariaLabel }` contract — no route or component hand-rolls the trail
markup (the CAV-510 singleton, enforced in `pattern-contract.test.ts`):

```tsx
<nav aria-label={ariaLabel}>
  <ol className="flex flex-wrap items-center gap-1.5 text-sm">
    {items.map((crumb, index) => (
      <li key={`${crumb.name}-${index}`} className="flex items-center gap-1.5">
        {index > 0 ? <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-quaternary" /> : null}
        {crumb.href ? <AriaLink href={crumb.href} …>{crumb.name}</AriaLink>
                    : <span aria-current="page" …>{crumb.name}</span>}
      </li>
    ))}
  </ol>
</nav>
```

`PageBreadcrumb` (also in `board/breadcrumb.tsx`) is the **single placement
primitive** that wraps it in the codified position (`mx-auto max-w-container`,
`pt-4 md:pt-5`, left-aligned):

```tsx
export function PageBreadcrumb({ items, ariaLabel }: BreadcrumbData) {
  return (
    <div className="mx-auto w-full max-w-container px-4 pt-4 md:px-8 md:pt-5">
      <Breadcrumb items={items} ariaLabel={ariaLabel} />
    </div>
  );
}
```

New Page-family assemblies seat their domain breadcrumb through
`PageHeaderWithBreadcrumb`. The current `page-body.tsx`,
`listing-page-header.tsx`, and `job-detail.tsx` seats remain sanctioned only as
migration seams. Every domain seam takes resolved `BreadcrumbData` (`{ items,
ariaLabel }`) — routes pass data rather than reimplementing the trail or its
spacing.

## Do / Don't

| Do | Don't |
|---|---|
| Pass resolved breadcrumb data into `PageHeaderWithBreadcrumb` in new Page-family work. | Start new work on migration-only `PageBody` / `ListingPageHeader`, or hand-place `<Breadcrumb>` / `<PageBreadcrumb>` in a route. |
| Let `PageBreadcrumb` own the `pt-4 md:pt-5` hug — the SAME on band and band-less pages. | Re-decide the top spacing per page, so the crumb hugs the nav on one surface and floats mid-page on the next. |
| Hand-roll a second `<ol>` trail only inside `board/breadcrumb.tsx`. | Fork the trail markup anywhere else — the singleton gate fails on any duplicate `<ol>`. |
| Emit the matching `BreadcrumbList` JSON-LD alongside every visible trail (and render a trail wherever the JSON-LD exists). | Ship a visible trail with no JSON-LD, or JSON-LD with no visible trail. |
| Pass the resolved `{ name, href? }` crumbs; leave the current page's `href` empty. | Build hrefs by hand — crumb hrefs come from `@cavuno/board` path helpers / the view-model. |
| Reuse a redundant "back to X" link's job with the penultimate crumb. | Keep a bespoke "Back to blog / Back to profile" link once the trail already links that ancestor. |

## Used by

- `board/breadcrumb.tsx` — `Breadcrumb` (the only trail markup) + `PageBreadcrumb`
  (the only placement primitive).
- `board/page-header-with-breadcrumb.tsx` — the canonical Page-family seam for
  resolved breadcrumb data plus `PageHeader`.
- `board/page-body.tsx` — migration-only breadcrumb seam for band-less routes.
- `board/listing-page-header.tsx` — migration-only breadcrumb seam for listing routes.
- `board/job-detail.tsx` — seats `PageBreadcrumb` at the top of the header band.
- `board/job-search-page.tsx` — forwards the trail through the current migration shell.
- `programmatic-jobs-view.tsx` — the programmatic jobs pages (Jobs → heading).
- `routes/blog.$postSlug.tsx`, `blog.index.tsx`, `blog.tag.$tagSlug.tsx`,
  `blog.author.$authorSlug.tsx` — the blog family (via a slot).
- `routes/companies.index.tsx`, `companies.$companySlug.index.tsx`,
  `companies.markets.$market.tsx`, `companies.$companySlug.jobs.index.tsx` — the
  companies family (via a slot).
- `routes/salaries.index.tsx` (+ the salary tree) — the salary family, through
  its current migration seam with `toSalaryBreadcrumbVM`.

## Related

- [Detail page](detail-page.md)
- [Listing page](listing-page.md)
