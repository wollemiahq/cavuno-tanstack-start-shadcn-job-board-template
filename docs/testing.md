# Testing strategy

The starter tests user-visible behavior and durable product contracts. It does
not freeze the current Tailwind classes or component tree. Owners should be
able to restyle, reorder, or replace their copied shadcn components without
rewriting unrelated tests.

## What belongs in the suite

1. **Domain tests** cover filtering, pagination, view-model projection,
   permissions, and other pure rules with representative inputs and outputs.
2. **Component tests** exercise interactions through accessible roles and
   labels: entering a query, choosing a suggestion, changing a filter, saving
   a job, applying, opening a dialog, and recovering from an empty or error
   state.
3. **Route tests** cover URL parsing and serialization, canonical links,
   selected-result state, loading and error transitions, and access gates.
4. **Release smoke checks** exercise the important routes against real board
   data at desktop and mobile widths. Visual review belongs in a browser pass,
   where layout, overflow, and responsive regressions can actually be seen.
5. **Distribution gates** may inspect files only when the file itself is the
   product contract: generated design artifacts, theme output, the installed
   shadcn inventory, or the absence of the retired UI dependency tree.
6. **Bundle budgets** inspect TanStack Start's emitted route manifest after a
   production build. The shared shell and global CSS have independent budgets;
   route increments use a conservative default with explicit allowances for
   the editor, chart, and applicant-pipeline routes that intentionally own
   heavier code. This guards regressions without pretending every lazy chunk
   is part of every page's initial download. Gated root features such as the
   sandbox preview toolbar and signed-in messaging dock are dynamically loaded
   and therefore charged only to routes that actually reference their shared
   UI. The model follows TanStack
   Router's [automatic code-splitting contract](https://tanstack.com/router/latest/docs/guide/automatic-code-splitting):
   route components and error/not-found UI are lazy while loaders normally stay
   in the critical graph to avoid an extra request waterfall. The gate prints
   the largest shared-shell assets so a regression is attributable without
   adding a bundle-analyzer dependency.

## What does not belong in the suite

- Exact Tailwind class lists or negative class assertions.
- Assertions that a feature imports a particular shadcn component.
- Source-text checks for JSX ordering, component names, or implementation
  anatomy.
- `outerHTML` snapshots of page structure.
- Repeating the same shadcn-ownership assertion in every feature test.
- Pixel or spacing claims in jsdom. Use a browser pass for those.

An implementation detail is test-worthy only when consumers rely on it as a
documented public API. Prefer a rendered behavior assertion whenever one can
express the requirement.

## Review checklist

Before adding a test, ask:

- What user or downstream consumer breaks if this assertion fails?
- Would the test still pass after a harmless restyle or internal refactor?
- Does another test or global distribution gate already protect this rule?
- Is jsdom capable of proving the claim, or is it a browser/visual check?

If those questions do not produce a durable reason, do not add the test.

## Verification commands

```sh
pnpm run typecheck
pnpm test
pnpm run check
pnpm run build
pnpm run check:bundle
```

For a visual change, also exercise the affected route at desktop and mobile
widths with real development data in the browser.

## Console errors that are not yours

### "Maximum update depth exceeded"

A dev-only artifact of Vite's dependency optimizer, not app code. Anything
that changes the lockfile mid-session (`pnpm add`, an SDK bump) makes Vite
re-optimize, and modules already loaded keep a stale `?v=<hash>` reference
to `@tanstack/router-core`. Two router instances then fight over the same
state until React trips its update-depth cap.

It is convincing because the stack points into `router.js` and it reproduces
on every route's initial load, which reads like a global component with a bad
effect. Client-side navigation never triggers it — only hydration, which is
the tell that a module is duplicated rather than a render looping.

Clear the cache and restart instead of bisecting effects:

```sh
rm -rf node_modules/.vite .tanstack
```

A production build never shows it, so `pnpm run build && pnpm exec vp preview`
is the check that settles whether a console error is real.
