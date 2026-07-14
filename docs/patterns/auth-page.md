---
name: Auth page
purpose: The centered single-column auth shell — mark, display heading, form, OR divider, social buttons.
primitives: [AuthCard, Field, FormError, AuthDivider, Button, Input, RadioGroup, InputOTP]
usedBy: [src/components/auth-form.tsx, src/routes/auth.sign-in.tsx, src/routes/auth.sign-up.tsx, src/routes/auth.forgot-password.tsx, src/routes/auth.reset-password.tsx, src/routes/auth.magic-link.tsx, src/routes/auth.employer.sign-up.tsx]
---

## Purpose

Every auth surface uses one centered single-column Rhea card: a logo mark, a
display heading with supporting text, the form region, an "OR" divider, and the
social sign-in buttons. The shell and controls use owned shadcn/Base UI
primitives, so adopters can replace the component implementations without
rewriting route behavior.

## When to use

- Sign in, sign up, magic link, password reset, email verification — any
  authentication step.
- **When NOT to use** — an in-app data-entry form; that is the
  [Form page](form-page.md).

## Anatomy

- `AuthCard` — the centered card: mark → semantic `h1` → supporting text → children.
- `Field` — a labeled shadcn `Input` with native validation.
- `FormError` — the destructive, live error line.
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

| Do                                                                                                           | Don't                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Compose `AuthCard` / `Field` / `FormError` / `AuthDivider`.                                                  | Rebuild the centered column per route.                                  |
| Preserve the validated `returnTo` value through sign-in, sign-up, verification, magic-link, and OAuth paths. | Link to a bare auth route from inside an in-progress candidate journey. |
| Use Base UI-backed shadcn controls for composite widgets such as radio groups and OTP entry.                 | Recreate composite keyboard behavior with buttons and ARIA roles.       |

## Used by

- `auth-form.tsx` — the shell + field primitives.
- The listed `auth.*` routes. `password.tsx` remains a legacy migration reference.

## Password-reset continuation boundary

The forgot-password and reset-password pages retain a validated `returnTo`
value in their local links. `@cavuno/board` 1.34 accepts only `email` for the
forgot-password request, so the emailed reset URL cannot carry that destination
yet. Until the SDK exposes a reset callback destination, a reset completed from
email resumes at the candidate account default rather than the exact job.

## Related

- [Form page](form-page.md)
- [Form feedback](form-feedback.md)
