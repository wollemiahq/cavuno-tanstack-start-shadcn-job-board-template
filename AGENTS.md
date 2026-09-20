# Agent rules — Cavuno board frontend

This is a running TanStack Start/Vite app on Cloudflare Workers. Customize it
to achieve the requested board outcome while keeping working capabilities,
security, accessibility, data contracts, and release quality. A redesign, new
composition, or different presentation is valid when the request calls for it.
Existing pages, patterns, and templates are references, not mandatory layouts.

## Preserve outcomes, adapt the implementation

Keep existing board capabilities working unless the request changes them. That
means preserving useful data, permissions, states, errors, and navigation—not
the exact current UI, loading treatment, loader, or mapper shape. Adapt, extend,
or rewrite route loaders, view-model mappers, server functions, and components
when the new experience needs it; keep their interfaces typed and test the
behavior that matters.

The main areas are:

- `src/routes/` composes pages and owns route behavior.
- `src/components/` and `src/theme.css` own presentation and visual language.
- `src/board/` maps Board data for the UI; change it when the presentation or
  data contract needs a different view model.
- `src/server/` and server-only helpers in `src/lib/` own Board API access and authenticated server functions; browser UI consumes server data.
- `src/lib/` holds shared environment, session, path, SEO, and correctness
  helpers.

## Security, tenancy, and public contracts

- `CAVUNO_API_URL`, `CAVUNO_BOARD`, and any demo-board binding select the
  tenant. Operators set them in `.dev.vars` or `wrangler.jsonc`. Do not
  hardcode, move, or change those operator-managed bindings. Other application
  configuration can change when the requested functionality needs it.
- Read Worker configuration through `getServerEnv()` in request-owned code;
  never read `process.env` at module scope. Keep Board API calls and auth/session
  refresh on the server. Private session credentials belong in the host-owned
  httpOnly cookie, never browser storage or module state.
- API HTML fields such as job and company descriptions are pre-sanitized. Render
  only those known fields as HTML; do not interpolate other strings into
  `dangerouslySetInnerHTML`.
- Preserve route and link contracts. Use `@cavuno/board/paths` for Board paths
  and TanStack's typed route links. Keep canonical URLs, `head()` metadata,
  `links.public`, feeds, sitemaps, robots rules, and job-detail `JobPosting`
  JSON-LD working unless the request explicitly changes that contract.

## Shared UI and visual quality

Use the existing Base UI-backed shadcn components in `src/components/ui/`.
Extend shared `Button`/`Card` variants or add a shared component when a visual
treatment or interaction recurs. Put repeated colors, type, radii, and other
visual decisions in semantic tokens in `src/theme.css`; ordinary layout and
composition classes may stay local. Do not copy primitive styling into feature
components or introduce an abstraction with no clear reuse. `DESIGN.md` and
`docs/patterns/` describe the current system and useful examples; follow them
when they fit the goal, and make a different composition when they do not.

## Copy and generated output

Use Paraglide message keys for UI copy, including accessible names, with
interpolation and plural handling intact. Board content and authored editorial
pages use their existing content sources. Keep catalog key sets aligned with
`messages-parity.test.ts`; changing copy does not require enabling dormant
locales. Enabled locales are listed in `project.inlang/settings.json`.

Edit source inputs, not generated files (`src/paraglide/**`,
`src/theme/resolved.ts`, `DESIGN.md`, `design/tokens.dtcg.json`). The live Vite
server recompiles enabled message catalogs; dev/test/typecheck hooks prepare
runtime modules otherwise. `gen:messages` maintains catalogs and QA locales,
while `gen:paraglide` compiles runtime modules. Use the matching generator when
its outputs need updating, without repeating work the running tooling did.

## Verification

Choose checks that establish the requested outcome and protect affected
behavior: interactions, navigation, data, permissions, and relevant failure
states. Use a browser for responsive and visual changes. Update tests when
intended behavior changes; do not freeze yesterday's layout or implementation.

Run focused checks while iterating and broaden them when the change warrants
it. `pnpm run check`, `pnpm run typecheck`, and targeted `pnpm test` are available;
CI owns the complete release checks, including build and conformance. Reuse
valid results instead of repeating the same gate. Report what was verified and
any gaps, including unavailable browser checks.

Add dependencies only when the requested functionality needs them and existing
packages cannot provide it. Use relevant skills and design or subsystem docs
when the change touches their area; they are on-demand guidance, not a reason
to constrain a valid product direction.
