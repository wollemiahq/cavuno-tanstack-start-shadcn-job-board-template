---
name: Pending / loading
purpose: The in-flight treatment for route transitions, master-detail reads, and submitting actions.
primitives: [LoadingIndicator, Skeleton, Button]
usedBy: [src/components/application/loading-indicator/loading-indicator.tsx, src/components/board/job-search-detail-state.tsx, src/components/board/company-search-detail-state.tsx, src/routes/post.tsx]
---

## Purpose

While a loader resolves or an action is in flight, the surface shows a
consistent pending treatment rather than a frozen or blank screen. Route-level
transitions use `LoadingIndicator`; a master-detail selection preserves the
previous readable detail and disables its actions, or shows a structural
`Skeleton` only when no detail has loaded yet.

## When to use

- A submitting action (disable + label swap on the `Button`).
- A route/loader transition that would otherwise show a blank frame — where a
  skeleton or `LoadingIndicator` belongs.
- **When NOT to use** — a resolved empty result; that is an
  [Empty state](empty-state.md).

## Anatomy

- Action pending: `Button` `isDisabled={status === "pending"}` + a label swap.
- Route transition: the vendored `LoadingIndicator` (spinner / line / dots).
- Master-detail first load: a shadcn `Skeleton` matching the detail structure.
- Master-detail replacement: preserved detail with `aria-busy` and no live actions.

## Composition

The master-detail idiom preserves context whenever possible:

```tsx
<div aria-busy={status === "loading"}>
  {detail ?? <Skeleton className="h-52 w-full" />}
</div>
```

## Do / Don't

| Do                                                                             | Don't                                                             |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Disable the control and swap its label while an action is in flight.           | Leave a control live during submit.                               |
| Preserve stale master-detail content as read-only during replacement.          | Clear a useful detail pane for every selection.                   |
| Use the shared `Skeleton` or `LoadingIndicator` according to transition scope. | Hand-roll a one-off spinner or make skeleton content interactive. |

## Used by

- `src/components/application/loading-indicator/loading-indicator.tsx` — shared route-transition indicator.
- `src/components/board/job-search-detail-state.tsx` — jobs detail first-load and stale-detail treatment.
- `src/components/board/company-search-detail-state.tsx` — companies detail first-load and stale-detail treatment.
- `src/routes/post.tsx` — route-level pending indicator.

## Related

- [Empty state](empty-state.md)
- [Form feedback](form-feedback.md)
