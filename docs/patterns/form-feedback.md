---
name: Form feedback
purpose: The success / error / pending message tied to a form action, announced to assistive tech.
primitives: [FormError]
usedBy: [src/components/auth-form.tsx, src/components/board/alert-signup-form.tsx, src/components/board/apply-button.tsx, src/components/profile-form.tsx]
---

## Purpose

An action's outcome — success, error, or pending — is announced next to the
control that triggered it, with the right ARIA live role so assistive tech
hears it. Today this is a scatter of hand-rolled treatments; the pattern's job
is to converge them on one status primitive.

## When to use

- Any form or action button that reports success / failure / progress inline.
- **When NOT to use** — a zero-results or not-found state; that is an
  [Empty state](empty-state.md).

## Anatomy

- A single message element with `role="status"` (polite) or `role="alert"`
  (assertive) tied to `{ status, message }`.
- UUI status tokens: `text-error-primary` for errors, `text-tertiary` for
  neutral/pending.

## Composition

`FormError` (in `auth-form.tsx`) is the closest existing primitive:

```tsx
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-error-primary">{message}</p>;
}
```

## Do / Don't

| Do | Don't |
|---|---|
| Use one status primitive and the UUI status tokens. | Roll a bespoke line per surface — `apply-button` (`role="alert"`), `alert-signup-form`, `alerts-band`, `profile-form`, `danger-zone`, `resume-upload`, `avatar-upload` each hand-roll their own. |
| Use `text-error-primary` / `text-tertiary`. | Use `text-destructive` / `text-muted-foreground` (legacy) — `post.tsx`, `profile-form`, `danger-zone`, `avatar-upload`, `resume-upload` still do. |
| Give the message the correct `role="status"` / `role="alert"`. | Announce nothing. |

## Used by

- `FormError` — the auth error line.
- `apply-button`, `alert-signup-form`, `alerts-band`, `profile-form` — the treatments to converge.

## Related

- [Form page](form-page.md)
- [Auth page](auth-page.md)
- [Empty state](empty-state.md)
