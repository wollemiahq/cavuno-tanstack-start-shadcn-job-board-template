---
name: Form page
purpose: A page header, titled field sections, a field grid, and a submit with status — the shape of every data-entry surface.
primitives: [Input, Select, Label, Button, Checkbox, CandidateActionFeedback]
usedBy: [src/components/profile-form.tsx, src/components/experience-section.tsx, src/components/education-section.tsx]
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
- `<section>` blocks, each with an `h2` and a field grid.
- Fields: `Input` / `Select` / `Checkbox` with an explicit `Label`.
- Submit `Button` + `CandidateActionFeedback` (or the relevant domain-specific feedback component).

## Composition

Compose owned shadcn primitives explicitly so the label/control relationship
and validation behavior remain visible to both people and coding agents:

```tsx
<Label htmlFor="role">{label}</Label>
<Input id="role" name="role" required />
<CandidateActionFeedback state={feedback} />
```

## Do / Don't

| Do                                                                                                            | Don't                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Build candidate fields from the owned shadcn `Input` / `Select` / `Checkbox` / `Label` primitives.            | Import a second presentation system into candidate forms.           |
| Use native validation and visible loading, success, and retryable error feedback.                             | Swallow rejected mutations or leave a control indefinitely pending. |
| Style through semantic theme tokens such as `text-muted-foreground`, `border-border`, and `text-destructive`. | Hard-code palette values that bypass `theme.css`.                   |

## Used by

- `profile-form`, `experience-section`, and `education-section`.
- Employer and post-a-job forms remain legacy migration references; they are not consumers yet.

## Related

- [Form feedback](form-feedback.md)
- [Auth page](auth-page.md)
- [Account shell](account-shell.md)
