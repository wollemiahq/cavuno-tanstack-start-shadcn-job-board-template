# Contributing

Thanks for improving the Cavuno job board starter. It is a real, running app
that owners can reshape into their own board. Read [`AGENTS.md`](AGENTS.md) for
the technical contracts that protect data, security, accessibility, and SEO;
use the UI direction that best serves the requested product outcome.

## Get started

Requirements: **pnpm 11** (pinned in `package.json`) and **Node 24** (matches
CI).

```sh
git clone https://github.com/wollemiahq/cavuno-tanstack-start-shadcn-job-board-template
cd cavuno-tanstack-start-shadcn-job-board-template
cp .dev.vars.example .dev.vars
pnpm install
pnpm dev                         # http://localhost:3000
```

The default `.dev.vars` points at the sandbox board, which supplies realistic
data and preview states without an account. See
[`docs/preview-states.md`](docs/preview-states.md) when that helps exercise a
flow.

## Make and verify a change

Start with the user-visible behavior and reshape the relevant route,
components, server functions, or mappers as needed. Keep tenant bindings,
server-only API/auth, safe HTML handling, route/link/SEO contracts, message
keys, and generated-file ownership intact. Existing patterns are useful
examples; they do not dictate a requested redesign.

Run the checks that prove the change while iterating. For a UI change, exercise
the affected route and its keyboard/accessibility states in a browser. For
logic or server work, run affected tests (for example,
`pnpm test src/components/board/listing-search-band.test.tsx`) and typecheck.
Dev/test/typecheck prepare generated runtime modules. Real translation catalogs
remain authored inputs; `node scripts/pseudo-locale-enable.mjs` prepares ignored
QA locales for localization checks. Refresh `DESIGN.md` or the component usage
reference with `gen:design` or `gen:shadcn` when you need current documentation;
a presentation edit does not require rebuilding those inventories.
Add broader checks such as
`pnpm run check`, `pnpm run build`, or `pnpm run check:bundle` when the scope
calls for them. CI runs the full release and Board conformance gates, so do not
repeat the same full suite after every small edit.

In the pull request, describe the outcome, the behavior you verified, and any
checks or browser paths you could not run. Prefer evidence about interaction,
route state, permissions, accessibility, and errors over screenshots of
implementation details. Keep generated artifacts generated and include the
source change that owns them.

## Report an issue

Use the [issue templates](.github/ISSUE_TEMPLATE/). Include the board grounding
(sandbox or your own `pk_…` key), the affected route, and reproduction steps
when relevant.

## Code of conduct

Participation is governed by the [Contributor Covenant](CODE_OF_CONDUCT.md).
