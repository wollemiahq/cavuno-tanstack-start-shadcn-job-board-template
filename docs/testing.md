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
```

For a visual change, also exercise the affected route at desktop and mobile
widths with real development data in the browser.
