---
name: Pending / loading
purpose: The in-flight treatment for loader transitions and submitting actions.
primitives: [LoadingIndicator, Button]
usedBy: [src/components/application/loading-indicator/loading-indicator.tsx]
---

## Purpose

While a loader resolves or an action is in flight, the surface shows a
consistent pending treatment rather than a frozen or blank screen. Today the
board leans entirely on per-control disabled states; a shared skeleton/spinner
treatment for route transitions is the gap this pattern names.

## When to use

- A submitting action (disable + label swap on the `Button`).
- A route/loader transition that would otherwise show a blank frame — where a
  skeleton or `LoadingIndicator` belongs.
- **When NOT to use** — a resolved empty result; that is an
  [Empty state](empty-state.md).

## Anatomy

- Action pending: `Button` `isDisabled={status === "pending"}` + a label swap.
- Route transition: the vendored `LoadingIndicator` (spinner / line / dots).

## Composition

The action-pending idiom is the only one used today:

```tsx
<Button type="submit" isDisabled={status === "pending"}>
  {status === "pending" ? pendingLabel : submitLabel}
</Button>
```

## Do / Don't

| Do | Don't |
|---|---|
| Disable the control and swap its label while an action is in flight. | Leave a control live during submit. |
| Reach for the vendored `LoadingIndicator` for loader transitions. | Leave transitions bare — `LoadingIndicator` has **zero route usage** today; wire it in when adding a transition state rather than hand-rolling one. |

## Used by

- `LoadingIndicator` — vendored, not yet consumed by any route.

## Related

- [Empty state](empty-state.md)
- [Form feedback](form-feedback.md)
