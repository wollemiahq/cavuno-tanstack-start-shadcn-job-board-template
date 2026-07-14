---
name: Form feedback
purpose: The success / error / pending message tied to a form action, announced to assistive tech.
primitives: [Alert, AlertDescription, FieldError, FieldDescription, Spinner]
usedBy: [src/components/auth-form.tsx, src/components/board/alert-signup-form.tsx, src/components/candidate-action-feedback.tsx, src/components/profile-form.tsx, src/routes/alerts.manage.tsx]
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
- Form- or action-level outcome: `Alert` + `AlertDescription`; use
  `variant="destructive"` for failures and `role="status"` for polite success.
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
| Use `FieldError` / `FieldDescription` for field-local feedback and `Alert` for action-level feedback. | Render a bespoke colored paragraph for each form. |
| Let the owned shadcn primitives resolve `destructive` and `muted-foreground` through `theme.css`. | Reintroduce removed status tokens or hard-code palette values. |
| Give success the polite `role="status"`; let destructive alerts remain assertive. | Make every update assertive or announce nothing. |
| Put `Spinner` inside a disabled pending button when the action itself is the loading locus. | Show an unrelated page spinner for a single pending action. |

## Used by

- `auth-form` — its `FormError` helper renders canonical `FieldError`.
- `alert-signup-form` and `profile-form` — field-local `FieldError` /
  `FieldDescription`, with `Spinner` for pending submission.
- `candidate-action-feedback` and `alerts.manage` — action-level `Alert`
  compounds.

## Related

- [Form page](form-page.md)
- [Auth page](auth-page.md)
- [Empty state](empty-state.md)
