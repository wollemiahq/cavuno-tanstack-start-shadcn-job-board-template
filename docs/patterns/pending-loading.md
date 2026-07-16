---
name: Pending / loading
purpose: The in-flight treatment for route transitions, master-detail reads, and submitting actions.
primitives: [PublicContentPending, Skeleton, Spinner, Button]
usedBy: [src/components/board/public-content-pending.tsx, src/components/board/job-search-detail-state.tsx, src/components/board/company-search-detail-state.tsx, src/components/board/talent-search-detail-state.tsx, src/routes/blog.index.tsx, src/routes/salaries.index.tsx, src/routes/post.tsx]
---

## Purpose

While a loader resolves or an action is in flight, the surface shows a
consistent pending treatment rather than a frozen or blank screen. Public
content routes use the shared `PublicContentPending` Page-family skeleton. Job
detail selections use the same structural `Skeleton` frame on first load and
replacement so entity identity never mixes across a transition.

## When to use

- A submitting action (disable the `Button`, add `Spinner`, and update its label).
- A route/loader transition that would otherwise show a blank frame — where a
  structural `Skeleton` belongs.
- **When NOT to use** — a resolved empty result; that is an
  [Empty state](empty-state.md).

## Anatomy

- Action pending: `Button` `disabled={status === "pending"}` + an inline
  `Spinner` + a label swap.
- Public route transition: `PublicContentPending`, a non-interactive Page-family
  composition of owned shadcn `Skeleton` blocks.
- Job-detail first load and replacement: the same shadcn `Skeleton`
  structure, with the loaded surface's header, title, metadata, action, and
  body slots kept at matching dimensions.
- Master-detail loading status: an `sr-only` label inside the `role="status"`
  region; the skeleton is the only visible loading treatment.
- Master-detail idle state: render nothing until a real entity is selected; idle
  is not loading.
- Job-detail replacement: mark the detail `aria-busy`, remove live actions,
  and render button-shaped skeletons in the same action slots.
- Reduced motion: skeleton pulse animation is disabled through
  `motion-reduce:animate-none`.

## Composition

The job-detail idiom preserves the pane frame without mixing entity data:

```tsx
<Button disabled={pending}>
  {pending ? <Spinner data-icon="inline-start" /> : null}
  {pending ? copy.saving : copy.save}
</Button>

<PublicContentPending label={copy.loadingContent} />
```

## Do / Don't

| Do                                                                                                                          | Don't                                                                      |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Disable the control, add an inline `Spinner`, and swap its label while an action is in flight.                             | Leave a control live during submit or use a page loader for one button.    |
| Keep one structural skeleton contract for job first load and replacement.                                                   | Mix the previous job's text or live controls into the next job's loading state. |
| Use `PublicContentPending` for blog/salary route transitions and structural `Skeleton` blocks for master-detail first load. | Hand-roll a one-off spinner or make skeleton content interactive.          |
| Keep a concise loading label available to assistive technology.                                                             | Put visible “Loading…” copy beside a skeleton that already communicates it. |
| Make skeleton geometry resemble the content it replaces and disable its pulse under reduced motion.                        | Use a generic full-pane block or animate despite the user’s motion setting. |
| Render no detail placeholder while selection is idle.                                                                       | Announce an indefinite load when there is no selected entity.              |

## Used by

- `src/components/board/public-content-pending.tsx` — shared public-route Page skeleton.
- `src/components/board/job-search-detail-state.tsx` — jobs detail first-load
  and replacement skeleton treatment.
- `src/components/board/company-search-detail-state.tsx` — companies detail first-load and stale-detail treatment.
- `src/components/board/talent-search-detail-state.tsx` — public-profile
  first-load, read-only stale detail, recoverable error, and retry treatment.
- `src/routes/blog.*` and `src/routes/salaries.*` — route-level pending surfaces.
- `src/routes/post.tsx` — route-level pending indicator.

## Related

- [Empty state](empty-state.md)
- [Form feedback](form-feedback.md)
