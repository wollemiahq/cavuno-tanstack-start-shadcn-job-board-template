---
name: Auth page
purpose: The centered single-column auth shell — mark, display heading, form, OR divider, social buttons.
primitives: [AuthCard, Field, FormError, AuthDivider, SocialButton]
usedBy: [src/components/auth-form.tsx, src/routes/auth.sign-in.tsx, src/routes/auth.sign-up.tsx, src/routes/auth.forgot-password.tsx, src/routes/auth.reset-password.tsx, src/routes/auth.magic-link.tsx, src/routes/auth.employer.sign-up.tsx, src/routes/password.tsx]
---

## Purpose

Every auth surface uses one open, centered single-column shell: a logo mark, a
display heading with supporting text, the form region, an "OR" divider, and the
social sign-in buttons. No card/ring wrapper — the auth surfaces sit on the bare
page ground, matching the Untitled UI log-in examples.

## When to use

- Sign in, sign up, magic link, password reset, email verification — any
  authentication step.
- **When NOT to use** — an in-app data-entry form; that is the
  [Form page](form-page.md).

## Anatomy

- `AuthCard` — the centered `max-w-sm` column: mark → `h1` (`text-display-xs md:text-display-sm`) → supporting text → children.
- `Field` — a required `Input` with native validation.
- `FormError` — the error line (`text-error-primary`).
- `AuthDivider` — the hairline "OR" separator before social buttons.

## Composition

`auth-form.tsx` exports the whole shell; routes compose it:

```tsx
<AuthCard title={title} supportingText={supportingText}>
  <Field label={emailLabel} name="email" type="email" autoComplete="email" />
  <FormError message={error} />
  <Button type="submit">{submitLabel}</Button>
  <AuthDivider label={orLabel} />
  {/* social buttons */}
</AuthCard>
```

## Do / Don't

| Do | Don't |
|---|---|
| Compose `AuthCard` / `Field` / `FormError` / `AuthDivider`. | Rebuild the centered column per route. |
| Surface success/pending through a shared feedback line. | Hand-roll the "magic-link sent" banner — `auth.sign-in` still rolls a bespoke `rounded-lg bg-secondary p-3` banner; fold it onto [Form feedback](form-feedback.md). |

## Used by

- `auth-form.tsx` — the shell + field primitives.
- All `auth.*` routes and `password.tsx`.

## Related

- [Form page](form-page.md)
- [Form feedback](form-feedback.md)
