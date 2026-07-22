---
name: Alert capture
purpose: The email job-alert subscribe surfaces — inline form and floating prompt — over one subscribe contract.
primitives: [AlertSignupForm, JobAlertFloatingPrompt, Card, Field, FieldLabel, FieldDescription, FieldError, InputGroup, ButtonGroup, Button, Spinner]
usedBy: [src/components/board/alert-signup-form.tsx, src/components/job-alert-floating-prompt.tsx, src/routes/companies.$companySlug.jobs.$jobSlug.tsx, src/routes/jobs.index.tsx, src/routes/index.tsx]
---

## Purpose

The board captures job-alert subscriptions in two shapes that share one
subscribe contract and one copy view-model (`toAlertSignupVM`): the inline
`AlertSignupForm` (on job detail) and the context-carrying
`JobAlertFloatingPrompt` on job listings. Both surface the idempotent subscribe
statuses honestly (`created` / `duplicate` / `error`).

## When to use

- Any listing or detail surface where a visitor should be offered an email
  alert for this search / company / topic.
- **When NOT to use** — a generic marketing CTA; alert capture is specifically
  the job-alert subscribe seam.

## Anatomy

- `AlertSignupForm` — the inline shadcn `Card`; its email control composes
  `Field`, `InputGroup`, `ButtonGroup`, and `Button`.
- `JobAlertFloatingPrompt` — the floating, context-aware prompt on job listings.
- Both share the `toAlertSignupVM(language, labels)` copy + status model.
- Pending submit uses `Spinner` inside the disabled button; failures use
  `FieldError`, while created and duplicate outcomes use `FieldDescription`
  with `role="status"`.

## Composition

Both surfaces resolve their copy and their status message through the one
`toAlertSignupVM` view-model, so the same idempotent outcomes read identically
wherever the seam appears:

```tsx
const vm = toAlertSignupVM(language, labels);
const message =
  status === "created" ? vm.messages.created
  : status === "duplicate" ? vm.messages.duplicate
  : status === "error" ? vm.messages.error : null;
```

## Do / Don't

| Do | Don't |
|---|---|
| Route copy + statuses through `toAlertSignupVM`. | Hardcode English copy that bypasses the copy seam. |
| Reuse `AlertSignupForm` / `JobAlertFloatingPrompt`. | Roll a third subscribe surface. |
| Compose field feedback with `FieldError` / `FieldDescription` and pending state with `Spinner`. | Add one-off status paragraphs or a second loading system. |
| Let semantic shadcn tokens resolve each surface's palette. | Hardcode hex values or removed compatibility tokens. |

## Used by

- `AlertSignupForm` — job detail (`alertSlot`).
- `JobAlertFloatingPrompt` — job listings (`/jobs`, `/`, the programmatic `/jobs/*` pages).

## Related

- [Listing page](listing-page.md)
- [Form feedback](form-feedback.md)
