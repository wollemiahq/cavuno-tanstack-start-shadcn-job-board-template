---
name: Section heading
purpose: A titled section row with an optional trailing "view all / see all" link.
primitives: [Link, Button]
usedBy: [src/components/board/home-landing.tsx, src/routes/salaries.index.tsx, src/routes/companies.$companySlug.index.tsx]
---

## Purpose

A content section opens with a display sub-heading on the left and, when the
section is a preview of a larger collection, a trailing "view all" link on the
right that points at the full listing. It gives the home and hub pages their
scannable rhythm.

## When to use

- A static section that previews part of a collection (latest jobs, top
  companies, salary hubs).
- **When NOT to use** — above a paginated result set with a count and sort. That
  is the [Results header](results-header.md).

## Anatomy

- A flex row: `items-end justify-between`.
- Left: `<h2 className="text-display-xs font-semibold text-primary md:text-display-sm">`.
- Right (optional): a `Link` / `Button color="link-color"` with a trailing arrow.

## Composition

`home-landing`'s `SectionHeader` is the reference shape:

```tsx
<div className="flex items-end justify-between gap-4">
  <h2 className="text-display-xs font-semibold text-primary md:text-display-sm">{title}</h2>
  <Link to={to} className="group inline-flex shrink-0 items-center gap-1 … text-brand-secondary …">
    {viewAllLabel}
    <ArrowRight className="size-4 … group-hover:translate-x-0.5" />
  </Link>
</div>
```

## Do / Don't

| Do | Don't |
|---|---|
| Use `text-display-xs md:text-display-sm font-semibold text-primary` for the title. | Reach for `text-2xl` / `font-heading` (legacy heading sizing). |
| Route the trailing link through `Link` (typed route id) or `board/paths`. | String-build the target URL. |
| Reuse one section-heading shape. | Keep three parallel copies — `home-landing` `SectionHeader`, `salaries.index` `HubSection`, and the `companies.$companySlug.index` inline "view all N jobs" each roll their own; consolidate as they are touched. |

## Used by

- `home-landing` `SectionHeader` — latest jobs / featured companies.
- `salaries.index` `HubSection` — the four salary hubs.
- `companies.$companySlug.index` — inline "view all N jobs".

## Related

- [Listing page](listing-page.md)
- [Results header](results-header.md)
