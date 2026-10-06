# Agent rules — Cavuno board frontend

This is a running TanStack Start/Vite app on Cloudflare Workers. Customize it
to achieve the requested board outcome. A redesign, new composition, or
different presentation is valid; existing pages, patterns, and templates are
references rather than mandatory layouts. Keep user-visible capabilities and
public contracts that the request does not change, while adapting loaders,
mappers, server functions, and components as needed.

## Where work belongs

- src/routes/ composes pages and owns route behavior.
- src/components/ owns presentation; src/theme.css owns semantic visual
  tokens.
- src/board/ maps Board data for the UI and may change when the needed view
  model changes.
- src/server/ and server-only helpers in src/lib/ own Board API access,
  authentication, sessions, paths, SEO, and other correctness helpers.
- src/routes/coming-soon-gate.tsx is the page visitors see while the board
  is password protected before launch. It is published as static HTML: no
  JavaScript runs on it, though CSS animation works. Keep the
  `data-cavuno-slot="password"` element; the platform puts the password
  entry there.

Use typed shared components when an interaction or visual treatment recurs.
Keep ordinary page composition local. Use the Base UI-backed shadcn components
under src/components/ui/ and semantic tokens for repeated colors, type, and
radii. DESIGN.md and docs/patterns/ are examples and references; they do
not prescribe a page structure or require an inventory update for ordinary UI
work.

## Security, data, and accessibility contracts

- CAVUNO_API_URL, CAVUNO_BOARD, and any demo-board binding select the
  tenant. Operators set them in .dev.vars or wrangler.jsonc; do not
  hardcode, move, or duplicate those bindings.
- Read Worker configuration through getServerEnv() in request-owned code;
  never read process.env at module scope. Keep Board API calls and
  auth/session refresh on the server. Private session credentials stay in the
  host-owned httpOnly cookie, never browser storage or module state.
- On Workers, I/O belongs to the request that started it, and a cancelled
  request's pending promises never settle. Never store a pending promise,
  Response, or stream in module scope, and never share one in-flight read
  across requests. Cache settled values only, written after the request's
  own await succeeds; use src/lib/settled-cache.ts. The one exception is
  sharing an in-flight read WITHIN a single request: use
  src/lib/request-memo.ts, keyed on getRequest(), so a different request can
  never reach the entry.
- API HTML fields such as job and company descriptions are pre-sanitized.
  Render only those known fields as HTML; do not interpolate other strings into
  dangerouslySetInnerHTML.
- Use @cavuno/board/paths for Board paths and TanStack typed route links.
  Preserve canonical URLs, head() metadata, public links, feeds, sitemaps,
  robots rules, and job-detail JobPosting JSON-LD unless the request changes
  that contract.
- Use semantic controls, labels, keyboard behavior, and accessible state. Keep
  UI copy in Paraglide message keys, including accessible names, with
  interpolation and plural handling intact.

## Generated inputs and validation

Edit source inputs, not generated files such as src/paraglide/**,
src/theme/resolved.ts, DESIGN.md, or design/tokens.dtcg.json. Real locale
catalogs are source files and are never rewritten by gen:messages; QA
pseudo-locale catalogs are generated when QA locales are enabled. gen:paraglide compiles
the locale runtime, and gen:theme still generates runtime token data. Shadcn
inventory and design descriptions are references rather than ordinary gates.

Run focused tests with `pnpm test path/to/file.test.tsx` (without `--`).
Add or update tests when they protect meaningful behavior or catch a real bug.
Copy and styling changes usually need no new automated tests. Prefer a few
useful behavior tests over many assertions about implementation details.
Keep test inputs independent of customer copy, branding, and navigation choices.
Find elements and expected wording through the message functions (`m.*()`)
or roles, never English literals. CI runs `pnpm run test:locale`, which reruns
the suite in other board languages; to run it locally, stop the dev server first.
Test starter-owned behavior and SDK integration, not behavior already covered
by the SDK or dependency tests.
Use a browser for responsive or visual changes, and relevant subsystem guidance
when a change touches that area.

Legal/about pages are data: `src/content/legal/<page>.json` holds `title`,
`description` and an `html` body per locale, plus the `sourceLanguage` the page
was written in. Edit the text there; `{{board_name}}` is filled in at request
time and the body is sanitized by `src/content/legal/render.ts`. The shipped
text is a standard sample the operator adapts. The impressum ships empty and
stays unpublished until the operator writes one.
