---
name: Form feedback
purpose: The success / error / pending message tied to a form action, announced to assistive tech.
primitives: [Alert, AlertDescription, FieldError, FieldDescription, Spinner, toast]
usedBy: [src/components/auth-form.tsx, src/components/board/alert-signup-form.tsx, src/lib/action-toast.ts, src/components/profile-form.tsx, src/routes/alerts.manage.tsx]
---

## Purpose

An action's outcome — success, error, or pending — is announced next to the
control that triggered it, with the right ARIA live role so assistive tech
hears it. The pattern chooses the canonical shadcn feedback primitive at the
correct scope.

## When to use

- Any form or action button that reports success / failure / progress inline.
- **When NOT to use** — a zero-results or not-found state; that is an
  [Empty state](empty-state.md).

## Anatomy

- Field validation: `FieldError`, immediately after its control.
- Field-local success or guidance: `FieldDescription` with `role="status"`.
- Form-level error that must persist next to the form (a failed submit that
  the user re-attempts in place): `Alert` + `AlertDescription`,
  `variant="destructive"`.
- **Save outcome** (a mutation completed — profile saved, alert created, item
  withdrawn): a transient **sonner toast** via the `toastActionSuccess` /
  `toastActionError` helpers (`src/lib/action-toast.ts`), not an inline box
  that shifts the page. Success is polite, failure is destructive. The Toaster
  is mounted once in `__root`.
- Pending action: a disabled `Button` with `Spinner` and an updated accessible
  label; do not add a second status line when the control already communicates
  progress.

## Composition

Choose the feedback compound by scope:

```tsx
<Field data-invalid={status === "error"}>
  <Input aria-invalid={status === "error"} />
  {status === "error" ? (
    <FieldError>{message}</FieldError>
  ) : message ? (
    <FieldDescription role="status">{message}</FieldDescription>
  ) : null}
</Field>

<Alert variant="destructive">
  <AlertDescription>{formError}</AlertDescription>
</Alert>
```

## Do / Don't

| Do | Don't |
|---|---|
| Use `FieldError` / `FieldDescription` for field-local feedback, `Alert` for a persistent form-level error, and a sonner toast for a save outcome. | Render a bespoke colored paragraph, or an inline "Changes saved." box, for each form. |
| Fire save confirmations through `toastActionSuccess` / `toastActionError` so the copy and treatment stay in one place. | Re-add a `CandidateActionFeedback`-style inline alert after a mutation. |
| Let the owned shadcn primitives resolve `destructive` and `muted-foreground` through `theme.css`. | Reintroduce removed status tokens or hard-code palette values. |
| Put `Spinner` inside a disabled pending button when the action itself is the loading locus. | Show an unrelated page spinner for a single pending action. |

## Used by

- `auth-form` — its `FormError` helper renders canonical `FieldError`.
- `alert-signup-form` and `profile-form` — field-local `FieldError` /
  `FieldDescription`, with `Spinner` for pending submission.
- `action-toast` (`toastActionSuccess` / `toastActionError`) — the save-outcome
  toasts fired from settings, profile, alerts, saved jobs, applications, and
  the candidate profile sections (replacing the retired inline
  `CandidateActionFeedback` alert).
- `alerts.manage` — a persistent action-level `Alert` compound.

## Related

- [Form page](form-page.md)
- [Auth page](auth-page.md)
- [Empty state](empty-state.md)
