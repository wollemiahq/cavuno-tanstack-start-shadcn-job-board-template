---
name: Alert capture
purpose: The email job-alert subscribe surfaces — dark band, inline form, and floating prompt — over one subscribe contract.
primitives: [AlertsBand, AlertSignupForm, JobAlertFloatingPrompt]
usedBy: [src/components/board/alerts-band.tsx, src/components/board/alert-signup-form.tsx, src/components/job-alert-floating-prompt.tsx, src/routes/jobs.index.tsx, src/routes/companies.index.tsx, src/routes/blog.index.tsx]
---

## Purpose

The board captures job-alert subscriptions in three shapes that share one
subscribe contract and one copy view-model (`toAlertSignupVM`): the full-width
dark `AlertsBand` above the footer on listing surfaces, the inline
`AlertSignupForm`, and the context-carrying `JobAlertFloatingPrompt` on job
listings. All three surface the idempotent subscribe statuses honestly
(`created` / `duplicate` / `error`).

## When to use

- Any listing or detail surface where a visitor should be offered an email
  alert for this search / company / topic.
- **When NOT to use** — a generic marketing CTA; alert capture is specifically
  the job-alert subscribe seam.

## Anatomy

- `AlertsBand` — a `dark`-scheme full-width panel: heading left, email +
  subscribe row right.
- `AlertSignupForm` — the inline card variant.
- `JobAlertFloatingPrompt` — the floating, context-aware prompt.
- All share the `toAlertSignupVM(language, labels)` copy + status model.

## Composition

The dark look is the Untitled UI dark-section trick — the section wears the
`dark` class so every token resolves to its dark value, no bespoke colors:

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
| Route copy + statuses through `toAlertSignupVM`. | Hardcode English — `ProgrammaticJobsView` renders a "Related Searches" heading with a hardcoded English fallback that bypasses the copy seam; move it onto a message key. |
| Reuse `AlertsBand` / `AlertSignupForm` / `JobAlertFloatingPrompt`. | Roll a fourth subscribe surface. |
| Let the `dark` class resolve the band's palette. | Hardcode dark hex values. |

## Used by

- `AlertsBand` — `companies.index`, `blog.index`, listing surfaces without another capture.
- `AlertSignupForm` — job detail (`alertSlot`).
- `JobAlertFloatingPrompt` — job listings.

## Related

- [Listing page](listing-page.md)
- [Form feedback](form-feedback.md)
