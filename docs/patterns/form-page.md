---
name: Form page
purpose: A page header, titled field sections, a field grid, and a submit with status — the shape of every data-entry surface.
primitives: [Card, Field, FieldSet, FieldLegend, FieldGroup, FieldLabel, FieldDescription, FieldError, Input, Select, Textarea, Checkbox, Button, Alert]
usedBy: [src/components/profile-form.tsx, src/components/experience-section.tsx, src/components/education-section.tsx, src/components/post-job-form.tsx, src/routes/employers.onboarding.$slug.tsx, src/routes/employers.companies.$slug.profile.tsx, src/routes/employers.companies.$slug.jobs.$jobId.applicants.tsx, src/routes/employers.dashboard.tsx]
---

## Purpose

Candidate data-entry surfaces share a
shape: a page header, one or more titled sections, a grid of labeled fields
built on owned shadcn/Base UI primitives, and a submit control that surfaces its
loading, success, and recoverable error status. Consistent field anatomy keeps
every form legible and accessible.

## When to use

- Any multi-field data-entry page.
- **When NOT to use** — the auth surfaces, which have their own centered shell
  ([Auth page](auth-page.md)).

## Anatomy

- Page header (display title + supporting text).
- `Card` sections or semantic `FieldSet` groups, with `FieldLegend` where a
  related control set needs a visible name.
- `FieldGroup` for spacing groups of fields.
- Each field composes `Field`, `FieldLabel`, a control (`Input`, `Select`,
  `Textarea`, or `Checkbox`), optional `FieldDescription`, and `FieldError`.
- Submit `Button` + an action-level `Alert` or the domain feedback component
  that wraps it.

### Action placement (canonical)

- **In-page forms** (a form living in the page or a `Card`): the primary
  action sits **left-aligned** at the end of the form, in reading flow under
  the left-aligned fields (e.g. "Save profile").
- **Overlay editors** (`Dialog`, `Sheet`, `AlertDialog`): footer actions are
  **right-aligned**, Cancel before the primary — the shadcn
  `DialogFooter`/`AlertDialogFooter` convention. Never mix the two on one
  surface.

## Composition

Compose owned shadcn primitives explicitly so the label/control relationship
and validation behavior remain visible to both people and coding agents:

```tsx
<Field data-invalid={Boolean(error)}>
  <FieldLabel htmlFor="role">{label}</FieldLabel>
  <Input id="role" name="role" aria-invalid={Boolean(error)} required />
  <FieldDescription>{description}</FieldDescription>
  {error ? <FieldError>{error}</FieldError> : null}
</Field>
```

## Do / Don't

| Do                                                                                                            | Don't                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Build fields from the owned shadcn `Field` family and canonical controls.                                     | Import a second presentation system or hand-roll label/error spacing. |
| Use native validation and visible loading, success, and retryable error feedback.                             | Swallow rejected mutations or leave a control indefinitely pending. |
| Style through semantic theme tokens such as `text-muted-foreground`, `border-border`, and `text-destructive`. | Hard-code palette values that bypass `theme.css`.                   |

## Used by

- Candidate profile: `profile-form`, `experience-section`, and
  `education-section`.
- Public posting: `post-job-form`.
- Employer onboarding, company profile, applicant management, and dashboard
  forms under `src/routes/employers.*`.

## Related

- [Form feedback](form-feedback.md)
- [Auth page](auth-page.md)
- [Account shell](account-shell.md)
