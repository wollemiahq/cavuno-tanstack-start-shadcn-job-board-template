# Agent rules — Cavuno board frontend

Rules for ANY agent committing to this repo: the hosted builder (whose
system prompt is derived from this file at runtime), a tenant's own
coding agent, and platform fleet runs all read the same contract.

## Never greenfield

This repo is a customization template. Every change — restyle, new
page, copy edit — customizes THIS codebase in place. Never rebuild the
app from scratch, never replace the chassis wholesale, never fork the
data layer. If a request seems to require starting over, it doesn't:
find the smallest edit to the existing surface.

## Grounding config is not editable

`CAVUNO_API_URL`, `CAVUNO_BOARD` (the `pk_…` publishable key), and
`CAVUNO_TRACKER_TOKEN` bind this frontend to one specific board. They
are injected by the platform — `wrangler.jsonc` vars in production,
`.dev.vars` in dev/sandbox — and are never edited, hardcoded,
duplicated, or moved by an agent. A change request that appears to
need different grounding is a platform operation, not a code edit.

## The customization surface

- `src/components/**` — presentational, dumb, typed-props components.
  Data arrives from loaders; components never fetch.
- `src/theme.css` — the canonical, shadcn CLI-owned theme. Edit it
  directly or with `shadcn apply`, then run `pnpm run gen:theme`; never edit
  `src/theme/resolved.ts` (generated).
- `src/styles.css` — global resets, app-shell defaults, and shared layout
  utilities. Theme tokens and radii live in `src/theme.css`.
- `src/routes/*.tsx` — page composition (markup, layout, copy). Keep
  loaders/server-function calls intact.
- `messages/**` — UI copy catalogs (Paraglide). Run
  `pnpm run gen:messages` after edits.

## Outside the surface — change only with explicit reason

- `src/board/**` — the **view-model layer** (Layer 1b): pure mappers
  (`toJobCardVM`, `toJobDetailVM`, `toApplyButtonVM`, `toOverallSalaryVM`,
  …) that call the `@cavuno/board` SDK's correctness functions
  (formatters, breadcrumbs, path helpers, copy) and hand components plain,
  resolved data. Consume these mappers and the SDK (Layer 1a);
  **never rewrite them** — that is what stops a redesign mis-calling a
  correctness function. Presentation (`src/components/**`, Layer 2) is
  yours to restructure freely; if a new section needs a resolved datum (a
  formatted value, a label, a breadcrumb), add it to the mapper rather
  than re-deriving it inside a component.
- `src/lib/**` — env access, SDK client, session cookie + middleware,
  theme mapper, JSON-LD builder. These encode security and correctness
  invariants.
- `src/server/**` — the only place the Board API is called. Auth is
  enforced per server function here.
- `vite.config.ts`, `wrangler.jsonc`, `tsconfig.json` — build config
  is locked.

## Hard rules

1. **Never read `process.env` at module scope** — it is `undefined` on
   Workers. Use `getServerEnv()` from `src/lib/env.ts` inside handlers.
2. **Never call the Board API from the browser** — add data needs as
   server functions in `src/server/`.
3. **Never store tokens anywhere but the session cookie** — no
   localStorage, no module state.
4. **HTML from the API** (`job.description`, `post.html`,
   `company.description`) **is pre-sanitized** — render as-is; never
   interpolate other strings into `dangerouslySetInnerHTML`.
5. Keep `head()` meta + the JobPosting JSON-LD on the job-detail route
   intact — they are the board's SEO contract.
6. New components compose owned **shadcn/ui components on Base UI** under
   `src/components/ui/`; merge classes with `cn` from `@/lib/utils`.
   App code consumes their canonical public APIs, never Base UI internals or
   data attributes, so adopters may swap in their own Base UI-backed shadcn
   source. Radix is an explicit migration, not a drop-in swap. The inherited
   Untitled UI layer has been removed: never reintroduce its component paths,
   icons, CSS utilities, or tokens.
7. **Board URL paths come from `@cavuno/board/paths`** (`jobDetailPath`,
   `jobsCategoryPath`, `jobsSkillPath`, `companyPath`, `companySalaryPath`,
   …) — never string-build a `/companies/…/jobs/…` or `/jobs/…` path.
   The canonical URL structure is a locked cross-surface contract (it must
   match the hosted board, sitemap, and emails); the absolute canonical URL
   for a job/company still comes from the API's `links.public`. Route
   `<Link to>` uses TanStack's typed route ids as usual.

## Dependencies

Package manager is **pnpm 11**, pinned in `package.json`. Installs in
CI and sandboxes run with a frozen lockfile. Supply-chain posture
(`pnpm-workspace.yaml`): dependency lifecycle scripts are blocked —
`allowBuilds` is an empty allowlist — and `minimumReleaseAge` keeps a
1-day cooldown (1440) on newly published versions. Do not add
dependencies unless the instruction explicitly requires one; packages
outside the platform's reviewed allowlist fail the deploy closed.

## Verify every change

```sh
pnpm run typecheck && pnpm test && pnpm run build
```

## Design system

Visual identity, design tokens, the component inventory, and design
do's-and-don'ts live in **`DESIGN.md`** (generated from `src/theme.css`

- component source + the registry snapshot — regenerate with
  `pnpm run gen:design`, never hand-edit; CI rejects drift). The
  machine-interchange token export is `design/tokens.dtcg.json`. Select
  from the DESIGN.md component inventory before writing new components.
  Page-level compositions follow the patterns in **`docs/patterns/`** —
  select a pattern before composing a route; never hand-roll a
  listing/detail/form/empty surface.

Primitives, in order: use or add current shadcn Rhea components under
`src/components/ui/`, backed by Base UI and styled from `src/theme.css`.
Route and pattern code depends only on canonical shadcn component props.
There is no parallel component or token system: `src/components/base/`,
`src/components/application/`, and the Untitled UI CSS compatibility layer are
not part of the release. New dependencies cannot be added at build time, so
compose from what is installed.

## Framework skills

TanStack skill mappings for this stack: `docs/tanstack-skills.md`.
