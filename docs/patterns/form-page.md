---
name: Form page
purpose: A page header, titled field sections, a field grid, and a submit with status — the shape of every data-entry surface.
primitives: [Input, Select, TextAreaBase, Label, Button, FileUpload]
usedBy: [src/routes/post.tsx, src/components/profile-form.tsx, src/routes/employers.onboarding.$slug.tsx, src/routes/employers.companies.$slug.profile.tsx]
---

## Purpose

Data-entry surfaces (post a job, edit a profile, onboard an employer) share a
shape: a page header, one or more titled sections, a grid of labeled fields
built on the Untitled UI form primitives, and a submit control that surfaces its
status. Consistent field anatomy keeps every form legible and accessible.

## When to use

- Any multi-field data-entry page.
- **When NOT to use** — the auth surfaces, which have their own centered shell
  ([Auth page](auth-page.md)).

## Anatomy

- Page header (display title + supporting text).
- `<section>` blocks, each with an `h2` and a field grid.
- Fields: `Input` / `Select` / `TextAreaBase` / `FileUpload` with a `Label`.
- Submit `Button` + a [Form feedback](form-feedback.md) status line.

## Composition

The Untitled UI field primitives carry the label, hint, and validation styling —
compose them rather than wrapping raw inputs:

```tsx
<Input label={label} name={name} isRequired validationBehavior="native" />
<Select aria-label={…} items={items}>{(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}</Select>
```

## Do / Don't

| Do | Don't |
|---|---|
| Build fields from the Untitled UI `Input` / `Select` / `TextAreaBase`. | Hand-roll `Labeled` / `SelectField` wrappers — `post.tsx` still does, and is the largest single deviation. |
| Use `text-display-*` for the page title and `gap-*` for spacing. | Use `text-2xl` + `space-y-*` (legacy sizing/rhythm), as `post.tsx` still does. |
| Style with UUI tokens (`text-tertiary`, `ring-secondary_alt`). | Use `text-muted-foreground` / `border-border` / `text-destructive` — `post.tsx`, the employer profile/onboarding/dashboard forms still carry these (frozen by the [legacy-token ratchet](README.md)). |

## Used by

- `post.tsx` — post-a-job (the reference deviation to migrate).
- `profile-form`, `employers.onboarding.$slug`, `employers.companies.$slug.profile`.

## Related

- [Form feedback](form-feedback.md)
- [Auth page](auth-page.md)
- [Account shell](account-shell.md)
