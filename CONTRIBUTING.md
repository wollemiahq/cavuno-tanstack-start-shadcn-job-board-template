# Contributing

Thanks for helping improve the Cavuno job board template. This is a
**customization template** — a real, running app you extend in place, not a
scaffold to rebuild. Please read [`AGENTS.md`](AGENTS.md) before your first
change: it is the contract every contributor (human or coding agent) follows,
and it explains what is safe to edit and what is load-bearing.

## Getting set up

Requirements: **pnpm 11** (pinned in `package.json`) and **Node 24** (matches
CI).

```sh
git clone https://github.com/wollemiahq/cavuno-tanstack-start-shadcn-job-board-template
cd cavuno-tanstack-start-shadcn-job-board-template
cp .dev.vars.example .dev.vars   # already points at the live sandbox board
pnpm install
pnpm dev                         # http://localhost:3000
```

The default `.dev.vars` grounds the app on the **sandbox board**, so you get
the full preview toolbar (persona switching, feature-flag toggles, captured
emails, reseed) with no keys or account. See
[`docs/preview-states.md`](docs/preview-states.md) for the guided tour.

## The verify triad

Every change must pass, locally and in CI:

```sh
pnpm run typecheck && pnpm test && pnpm run build
```

CI runs a superset (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)),
so run these before opening a PR to match it:

```sh
pnpm run check                # formatting + lint
pnpm run typecheck
pnpm test
pnpm run gen:design -- --check # DESIGN.md / tokens must not drift
pnpm run build
pnpm run check:bundle         # route-aware client bundle budgets
```

A separate CI job runs the Board API conformance probe against the built
worker on the sandbox (`cavuno-board doctor`). Testing philosophy — behavior
over markup — is in [`docs/testing.md`](docs/testing.md).

## What you can and can't touch

Read [`AGENTS.md`](AGENTS.md) in full, but the short version:

- **Customize freely:** `src/components/**` (presentation),
  `src/routes/*.tsx` (page composition), `src/theme.css` (via `shadcn apply`
  then `pnpm run gen:theme`), `src/styles.css`, and `messages/**` (run
  `pnpm run gen:messages` after edits).
- **Change only with explicit reason:** `src/board/**` (view-model mappers),
  `src/lib/**`, `src/server/**` — these encode correctness, security, and SEO
  invariants.
- **Locked:** `vite.config.ts`, `wrangler.jsonc`, `tsconfig.json`, and the
  grounding config (`CAVUNO_API_URL`, `CAVUNO_BOARD`). Generated files
  (`DESIGN.md`, `src/theme/resolved.ts`, `src/paraglide/**`) are never
  hand-edited — regenerate them.
- **Design & patterns:** select from the [`DESIGN.md`](DESIGN.md) component
  inventory and the [`docs/patterns/`](docs/patterns/README.md) compositions
  before writing new UI. Don't hand-roll a listing/detail/form/empty surface.

## Dependencies

Don't add dependencies unless a change explicitly requires one. Installs run
with a **frozen lockfile**, lifecycle scripts are blocked, and newly published
versions have a 1-day cooldown; packages outside the platform's reviewed
allowlist fail the deploy closed. Compose from what's installed.

## Pull requests

1. Branch from `main`.
2. Keep the change the **smallest edit to the existing surface** that solves
   the problem — never greenfield.
3. Run the verify triad (and ideally the full CI superset) locally.
4. Fill out the [PR template](.github/PULL_REQUEST_TEMPLATE.md) — say what
   changed, why, and how you verified it. Prefer behavior evidence
   (interaction, route state, a11y) over screenshots of Tailwind classes.
5. Keep generated artifacts regenerated, not hand-edited, so the design-drift
   check passes.

## Reporting issues

Use the [issue templates](.github/ISSUE_TEMPLATE/): **Bug report** for
something broken, **Feature request** for a proposal. Include your board
grounding (sandbox vs. your own `pk_…`) and reproduction steps.

## Code of conduct

Participation is governed by the [Contributor Covenant](CODE_OF_CONDUCT.md).
