---
name: Breadcrumb
purpose: The chevron-separated trail of ancestor links ending in the current page — the internal-linking + SEO spine back up the hierarchy.
primitives: [Breadcrumb, AriaLink]
usedBy: [src/components/board/breadcrumb.tsx, src/components/board/page-body.tsx, src/components/board/listing-page-header.tsx, src/components/board/job-detail.tsx, src/components/board/job-search-page.tsx, src/components/programmatic-jobs-view.tsx, src/routes/blog.$postSlug.tsx, src/routes/blog.index.tsx, src/routes/blog.tag.$tagSlug.tsx, src/routes/blog.author.$authorSlug.tsx, src/routes/companies.index.tsx, src/routes/companies.$companySlug.index.tsx, src/routes/companies.markets.$market.tsx, src/routes/companies.$companySlug.jobs.index.tsx, src/routes/salaries.index.tsx]
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

- **Placement is owned by ONE primitive** — `PageBreadcrumb`
  (`board/breadcrumb.tsx`). It is the ONLY sanctioned placement, and it is
  seated by exactly three seams: the **`breadcrumb` slot on `PageBody`** (every
  band-less page — a company profile, a blog article/tag/author, a salary
  page), the **`breadcrumb` slot on `ListingPageHeader`** (the listing heroes —
  jobs, companies, blog, markets, the company-jobs subpage), and the
  **`JobDetail` band**. All three render the SAME `PageBreadcrumb`, so the
  placement cannot be re-decided per page. A route never renders `<Breadcrumb>`
  or `<PageBreadcrumb>` itself — it passes the resolved `{ items, ariaLabel }`
  to a slot (`pattern-contract.test.ts` gates both).
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

Seats: `page-body.tsx` renders it for its `breadcrumb` slot (band-less pages);
`listing-page-header.tsx` renders it for its `breadcrumb` slot, above the
centered hero title (jobs via `job-search-page.tsx`, companies, blog, markets,
the company-jobs subpage, the programmatic jobs pages via
`programmatic-jobs-view.tsx`); and `job-detail.tsx` seats it at the top of its
header band. Every seam takes the resolved `BreadcrumbData` (`{ items,
ariaLabel }`) — routes pass DATA, never JSX, so the trail element and its
spacing live in one place.

## Do / Don't

| Do | Don't |
|---|---|
| Pass the resolved `{ items, ariaLabel }` to the `breadcrumb` slot on `PageBody` (band-less pages) or `ListingPageHeader` (listing heroes). | Render `<Breadcrumb>` / `<PageBreadcrumb>` yourself in a route with hand-rolled spacing (a `pt-*`/`mt-*` wrapper, or a loose first child leaning on the page container's `py-8`) — the placement gates in `pattern-contract.test.ts` fail on it. |
| Let `PageBreadcrumb` own the `pt-4 md:pt-5` hug — the SAME on band and band-less pages. | Re-decide the top spacing per page, so the crumb hugs the nav on one surface and floats mid-page on the next. |
| Hand-roll a second `<ol>` trail only inside `board/breadcrumb.tsx`. | Fork the trail markup anywhere else — the singleton gate fails on any duplicate `<ol>`. |
| Emit the matching `BreadcrumbList` JSON-LD alongside every visible trail (and render a trail wherever the JSON-LD exists). | Ship a visible trail with no JSON-LD, or JSON-LD with no visible trail. |
| Pass the resolved `{ name, href? }` crumbs; leave the current page's `href` empty. | Build hrefs by hand — crumb hrefs come from `@cavuno/board` path helpers / the view-model. |
| Reuse a redundant "back to X" link's job with the penultimate crumb. | Keep a bespoke "Back to blog / Back to profile" link once the trail already links that ancestor. |

## Used by

- `board/breadcrumb.tsx` — `Breadcrumb` (the only trail markup) + `PageBreadcrumb`
  (the only placement primitive).
- `board/page-body.tsx` — the `breadcrumb` slot for band-less pages (company
  profile, blog article/tag/author, the salary tree).
- `board/listing-page-header.tsx` — the `breadcrumb` slot for listing heroes.
- `board/job-detail.tsx` — seats `PageBreadcrumb` at the top of the header band.
- `board/job-search-page.tsx` — forwards the trail to `ListingPageHeader` (jobs).
- `programmatic-jobs-view.tsx` — the programmatic jobs pages (Jobs → heading).
- `routes/blog.$postSlug.tsx`, `blog.index.tsx`, `blog.tag.$tagSlug.tsx`,
  `blog.author.$authorSlug.tsx` — the blog family (via a slot).
- `routes/companies.index.tsx`, `companies.$companySlug.index.tsx`,
  `companies.markets.$market.tsx`, `companies.$companySlug.jobs.index.tsx` — the
  companies family (via a slot).
- `routes/salaries.index.tsx` (+ the salary tree) — the salary family, via
  `PageBody`'s slot with `toSalaryBreadcrumbVM`.

## Related

- [Detail page](detail-page.md)
- [Listing page](listing-page.md)
