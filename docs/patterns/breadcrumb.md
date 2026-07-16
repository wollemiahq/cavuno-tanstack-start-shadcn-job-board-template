---
name: Breadcrumb
purpose: A single bottom-of-page trail that preserves hierarchy without competing with dense page headers.
primitives: [Breadcrumb, ShellBreadcrumb, AriaLink]
usedBy: [src/components/board/breadcrumb.tsx, src/lib/shell-breadcrumb.ts, src/routes/__root.tsx]
---

## Purpose

Every public page has one visible breadcrumb trail immediately above the
footer. This gives visitors and crawlers a consistent route back through the
board hierarchy without adding a second navigation row above each page title.

Private application routes, authentication, and embedded widgets do not render
the public shell breadcrumb.

## When to use

- Use on every route rendered by the public board shell, including top-level,
  detail, directory, legal, and empty-state pages.
- Do not use inside embedded widgets, auth/account flows, messaging, settings,
  or employer application routes.

## Anatomy

- `resolveShellBreadcrumb` converts the current public pathname plus loaded
  entity names into ordered `{ name, href? }` data.
- `ShellBreadcrumb` owns the canonical 80rem width and responsive gutters.
- `Breadcrumb` composes the owned shadcn breadcrumb primitives. Ancestors are
  real links; the final item is current-page text.
- `RootLayout` renders the trail exactly once, after route content and before
  `Footer`.
- Routes continue to emit their domain-specific `BreadcrumbList` JSON-LD where
  applicable. JSON-LD does not create a second visible trail.

## Composition

```tsx
{shellBreadcrumb ? (
  <ShellBreadcrumb
    items={shellBreadcrumb.items}
    ariaLabel={copy.jobDetail.breadcrumbAriaLabel}
  />
) : null}
<Footer connected={shellBreadcrumb !== null} />
```

The placement is intentionally outside route components. Page headers, search
result columns, detail bands, and legal content never render breadcrumbs.

## Do / Don't

| Do | Don't |
| --- | --- |
| Resolve friendly names from loader data and use readable slugs while data is pending. | Show raw location, company, job, author, tag, or profile slugs when a loaded name exists. |
| Keep the visible trail immediately above the footer on every public page. | Put a second trail in a hero, result list, card, or detail header. |
| Keep private, auth, employer application, and embed routes out of the public trail. | Expose private application hierarchy in public chrome. |
| Leave the final crumb unlinked. | Link the visitor to the page they are already on. |

## Used by

- `src/routes/__root.tsx` — resolves and renders the one visible placement.
- `src/lib/shell-breadcrumb.ts` — maps public paths and loader entities to the
  trail data contract.
- `src/components/board/breadcrumb.tsx` — canonical width, spacing, and shadcn
  breadcrumb composition.

## Related

- [Detail page](detail-page.md)
- [Listing page](listing-page.md)
