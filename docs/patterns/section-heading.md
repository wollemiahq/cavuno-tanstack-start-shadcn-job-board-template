---
name: Section heading
purpose: A titled section row with an optional trailing "view all / see all" link.
primitives: [PageSection, Link, Button]
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

- `PageSection` with a visible `title`; it owns the semantic `h2` and spacing.
- Optional `actions`, usually a typed `Link` styled with `buttonVariants`.

## Composition

`PageSection` is the reference shape:

```tsx
<PageSection
  title={title}
  actions={
    <Link to={to} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      {viewAllLabel}
      <ArrowRight aria-hidden="true" data-icon="inline-end" />
    </Link>
  }
>
  {children}
</PageSection>
```

## Do / Don't

| Do | Don't |
|---|---|
| Let `PageSection` own the heading level, theme typography, and action alignment. | Recreate the heading row with page-specific type and color classes. |
| Route the trailing link through `Link` (typed route id) or `board/paths`. | String-build the target URL. |
| Reuse one section-heading shape. | Keep three parallel copies — `home-landing` `SectionHeader`, `salaries.index` `HubSection`, and the `companies.$companySlug.index` inline "view all N jobs" each roll their own; consolidate as they are touched. |

## Used by

- `home-landing` `PageSection` — latest jobs, featured talent, and blog.
- `salaries.index` — the four salary hubs.
- `companies.$companySlug.index` — inline "view all N jobs".

## Related

- [Listing page](listing-page.md)
- [Results header](results-header.md)
