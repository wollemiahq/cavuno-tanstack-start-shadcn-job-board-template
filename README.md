# TanStack Start + shadcn/ui job board template — powered by Cavuno

**Clone it, `pnpm dev`, and in under a minute you have a populated,
production-realistic job board** — real jobs and companies, a working
applicant tracker, captured outbound emails, and Stripe test-mode checkout.
No API key, no account, and no empty database to seed first.

Built on [TanStack Start](https://tanstack.com/start),
[Cloudflare Workers](https://workers.cloudflare.com),
[shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com),
[Tailwind CSS](https://tailwindcss.com), [Geist](https://vercel.com/font), and
[Lucide](https://lucide.dev). Data comes from [Cavuno](https://cavuno.com)
via the [Cavuno SDK](https://cavuno.com/sdk) (`@cavuno/board`), so every
surface is a real page wired to a real backend — not a mock.

![Cavuno job board home — real sandbox jobs and company cards](docs/media/home.png)

---

## Why this template is different

Most job board templates are a beautiful frontend with no real backend behind
it — the listings are hardcoded or mocked, and to actually launch you either
build the backend yourself (auth, applications, payments, emails, search) or
bolt on a separate service. This one is wired to a real backend from the first
clone, and it boots **populated** so you can see and build every real state
immediately. Two things make that work:

### 1. A zero-setup running product

`.dev.vars.example` already points at the **platform sandbox board** — a live,
deterministic fixture tenant that resets nightly and is safe to write to. So a
fresh clone boots straight into a full board with:

- **8 seeded scenario personas** you switch between from a **developer preview
  toolbar** (bottom-left, sandbox-only) — new candidates, verified candidates,
  premium/granted candidates, and employers from "just signed up" through
  "workspace admin with a live applicant pipeline." Switching sets a **real
  session cookie**, so you see each state exactly as that user would.
- **A working ATS** — the employer applicant pipeline is a real **kanban
  board** (columns are stages, cards are applicants) with pointer **and**
  keyboard drag-and-drop and optimistic moves.
- **Captured outbound email** — a `letter_opener`-style viewer over every email
  the board would send (magic-link sign-in, verification, password reset,
  alert double-opt-in). The sandbox captures instead of delivering, so every
  flow that "continues in your inbox" is completable on the spot.
- **Payments that work with Stripe test cards** — the sandbox runs Stripe
  **test mode**, so the candidate paywall and the job-posting funnel accept
  `4242 4242 4242 4242` with **no Stripe account or keys of your own.**

The full sandbox playbook — persona roster, feature-flag toggles, reseed, and
the headless server-function equivalents — is in
[`docs/preview-states.md`](docs/preview-states.md).

### 2. Agent-ready by construction

[`AGENTS.md`](AGENTS.md) is a machine-readable contract for coding agents
working in this repo. It works because the codebase is layered so that
correctness can't be redesigned away:

- **Layer 1a — the `@cavuno/board` SDK**: formatters, path helpers,
  breadcrumbs, copy. The correctness functions.
- **Layer 1b — view-model mappers** (`src/board/**`): pure functions
  (`toJobCardVM`, `toJobDetailVM`, …) that call the SDK and hand components
  plain, resolved data.
- **Layer 2 — presentation** (`src/components/**`): dumb, typed-props
  components you can restructure freely without ever mis-calling a formatter.

The pinned SDK also ships version-matched **Cavuno Agent Skills** for Codex,
Claude Code, Cursor, and other compatible coding agents. This starter checks
in the Claude-compatible copy under `.claude/skills`; the same corpus can be
installed or refreshed in any existing compatible agent skills directory with:

```sh
npx @cavuno/board setup
```

The skills cover the complete board surface—including TanStack Start and
Cloudflare wiring, auth and session ownership, jobs, companies, salaries,
applications, messaging, SEO, i18n, theming, and runtime verification—so an
agent works from the contracts for the exact SDK version installed here rather
than stale generic documentation. `cavuno-board doctor` also detects when the
checked-in skills no longer match that version.

That separation makes this an **agent-buildable** job board template: an agent
can redesign the surface without breaking salary math, canonical URLs, auth
and session ownership, or SEO.

---

## Quickstart

```sh
git clone https://github.com/wollemiahq/cavuno-tanstack-start-shadcn-job-board-template
cd cavuno-tanstack-start-shadcn-job-board-template
cp .dev.vars.example .dev.vars   # already points at the live sandbox board
pnpm install
pnpm dev                         # http://localhost:3000
```

That's it. No keys, no account, no database. The dev server boots on the
**sandbox board** and the preview toolbar appears bottom-left — start switching
personas.

> Requires **pnpm 11** (pinned in `package.json`) and Node 24 (matches CI).

> **Known dev-only papercut:** if the very first request to a freshly booted
> `pnpm dev` is `/embed/jobs`, it answers 500 ("Something went wrong") and then
> works on every request after. Refresh once. Any other route hit first also
> avoids it. This is upstream — Vite's on-demand SSR module evaluation hands
> `createSsrRpc` a not-yet-callable `getServerFnById`, so the root shell's
> `getBoardContext()` throws before the page renders
> ([TanStack/router#6451](https://github.com/TanStack/router/issues/6451),
> [#7459](https://github.com/TanStack/router/issues/7459)). `/embed/jobs` is the
> only route that trips it, because it is the only one whose loader calls
> `getBoardContext()` concurrently with the root shell's own call. **Production
> is unaffected** — Rollup resolves the chain statically at build time, so
> `pnpm build && pnpm preview` serves it 200 on a cold first hit.

**The workflow:** build and style your board against the sandbox — it's
populated, safe to write to, and resets nightly — then go live by swapping one
value, `CAVUNO_BOARD`, for your own board's `pk_…` publishable key (`.dev.vars`
in dev, `wrangler.jsonc` vars in production). The app code is identical either
way; you're just pointing it at your real board instead of the sandbox.

> **The preview toolbar is sandbox-only.** Personas, the captured-email
> viewer, reseed, and the flag toggles are gated on the board being the
> platform sandbox (`sandbox: true`), so they exist purely for exploring and
> developing the template. Point `CAVUNO_BOARD` at your own board and the
> toolbar simply isn't there — you're now developing against your real board,
> with real users, real sessions, and real outbound email. That gate is board
> truth from the API, not an env flag, so the toolbar can never render on a
> production board.

| Variable | What | Where |
|---|---|---|
| `CAVUNO_API_URL` | Board API base URL (`https://api.cavuno.com`) | `.dev.vars` / `wrangler.jsonc` |
| `CAVUNO_BOARD` | Your board's `pk_…` publishable key (Dashboard → Settings → API) | `.dev.vars` / `wrangler.jsonc` |

The `pk_…` key is **client-safe by design**; user sessions live in a
host-owned httpOnly cookie this app manages itself. The Board API is only ever
called server-side (`src/server/**`).

---

## Take the tour

The sandbox exists so you can see every state without seeding anything:

1. **Switch personas** — toolbar → **Employers → `employer-admin`**. You are
   now signed in as a workspace admin.
2. **Drag a card across the kanban** — open a job's applicants and move a
   candidate between pipeline stages (mouse or keyboard).
3. **Read a captured email** — toolbar → **Emails** to see the outbound mail
   the board just produced, rendered in full.
4. **Check out with a test card** — trigger the candidate paywall or the
   job-posting funnel and pay with `4242 4242 4242 4242`. No Stripe setup.

![Preview toolbar switching between the 8 seeded personas](docs/media/persona-switcher.png)
![Employer applicant pipeline as a drag-and-drop kanban board](docs/media/kanban.png)
![Captured outbound email viewer](docs/media/captured-emails.png)

---

## What's inside

Every product surface is a real, SSR-rendered page wired to the Board API.
Feeds, metadata, redirects, and other machine endpoints ship alongside them:

| Surface | Route(s) |
|---|---|
| Home (company discovery + latest jobs) | `/` |
| Jobs search (filters + master/detail) | `/jobs`, `/jobs/locations` |
| Job detail (meta + Google for Jobs JSON-LD) | `/companies/:companySlug/jobs/:jobSlug` |
| Programmatic SEO job listings | `/jobs/:keyword`, `/jobs/skills/:skill`, `/jobs/locations/:location`, `/jobs/locations/:location/:keyword`, `/jobs/locations/:location/skills/:skill` |
| Companies, company jobs, and company salaries | `/companies`, `/companies/:companySlug`, `/companies/markets/:market`, `/companies/:companySlug/jobs`, `/companies/:companySlug/salaries`, `/companies/:companySlug/salaries/:categorySlug` |
| Salaries hubs | `/salaries`, `/salaries/companies`, `/salaries/titles`, `/salaries/skills`, `/salaries/locations` |
| Salary title and skill explorers | `/salaries/titles/:slug`, `/salaries/titles/:slug/locations`, `/salaries/titles/:slug/:locationSlug`, `/salaries/skills/:slug`, `/salaries/skills/:slug/locations`, `/salaries/skills/:slug/:locationSlug` |
| Salary location explorers | `/salaries/locations/:slug`, `/salaries/locations/:slug/titles`, `/salaries/locations/:slug/skills` |
| Talent directory and profiles | `/talent`, `/p/:handle` |
| Blog, tags, and authors | `/blog`, `/blog/:postSlug`, `/blog/tag/:tagSlug`, `/blog/author/:authorSlug` |
| Candidate and employer authentication | `/auth/sign-in`, `/auth/sign-up`, `/auth/employer/sign-up`, `/auth/join`, `/auth/magic-link`, `/auth/oauth-complete`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/verify-email-required`, `/auth/verify-work-email` |
| Candidate profile, applications, saved jobs, and settings | `/account`, `/matches`, `/saved-jobs`, `/account/access`, `/me/applications`, `/settings` |
| Candidate alerts and messaging | `/me/alerts`, `/alerts/confirm`, `/alerts/manage`, `/messages`, `/messages/:conversationId` |
| Employer entry and onboarding | `/employers`, `/employers/dashboard`, `/employers/onboarding/:slug` |
| Employer company workspace (jobs + stats chart, **applicant pipeline kanban**, company profile) | `/employers/companies/:slug`, `/employers/companies/:slug/jobs/new`, `/employers/companies/:slug/jobs/:jobId/edit`, `/employers/companies/:slug/jobs/:jobId/applicants`, `/employers/companies/:slug/profile` |
| Post a job (anonymous funnel) | `/post` |
| Board access and embeds | `/password`, `/embed/jobs` |
| Content and legal pages | `/about`, `/privacy-policy`, `/terms-of-service`, `/cookie-policy`, `/impressum` |
| Feeds and discovery | `/jobs/rss.xml`, `/blog/rss.xml`, `/sitemap.xml`, `/sitemap/:file`, `/robots.txt`, `/indexnow-key.txt` |
| OpenGraph assets | `/companies/:companySlug/jobs/:jobSlug/og`, `/blog/:postSlug/og`, `/blog/og/:postSlug.json` |
| Platform and integration endpoints | `/.well-known/cavuno.json`, `/site.webmanifest`, `/ads.txt`, `/go/*` |

The same supported surfaces stay unprefixed by default (English). Extra
chrome locales (`/de/…`, `/fr/…`) are opt-in — `pnpm locale:add de`.

Cross-cutting capabilities that ship on top of those routes:

- **SEO built in** — canonical URLs, `JobPosting` JSON-LD (Google for Jobs),
  `sitemap.xml`, `robots.txt`, job and blog RSS feeds, and OpenGraph images.
  Job-detail URLs mirror Cavuno's hosted board, so a board migrating hosted →
  headless keeps its indexed URLs.
- **Real-data discipline** — the design handles messy data by construction:
  long titles clamp, absent salaries are omitted (never an empty label), skill
  tags cap at `3 + N`, missing logos fall back to initials.
- **i18n ready, English by default** — [Paraglide JS](https://paraglidejs.com)
  compile-time catalogs, SSR-resolved on Workers. Production ships English
  only (no language switcher, no `/de/` or `/fr/` routes). German and French
  catalogs are in the repo dormant; `pnpm locale:add de` enables a locale,
  compiles Paraglide, and the footer switcher appears. Deliberately
  chrome-only: the UI localizes while board content (jobs, companies) stays
  in the board's own language, matching the platform's single-language
  board model.
- **Dark mode** keyed to a single `.dark` class, and **accessibility** from
  Base UI semantics and the owned components' explicit ARIA contracts.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR) on React 19 |
| Runtime | [Cloudflare Workers](https://workers.cloudflare.com) |
| Build | Vite+ (`vp`) |
| UI | [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com), [Tailwind CSS 4](https://tailwindcss.com), [Geist](https://vercel.com/font), [Lucide](https://lucide.dev) |
| Backend | [Cavuno](https://cavuno.com) — the hosted job board platform |
| Data | [Cavuno SDK](https://cavuno.com/sdk) (`@cavuno/board`) |
| i18n | [Paraglide JS](https://paraglidejs.com) |

Exact versions are in [`package.json`](package.json). `@cavuno/board` and
`vite-plus` are pinned **exact** on purpose — npm's `min-release-age` policy
would otherwise silently resolve `@latest` down to an older version.

---

## Analytics & conversion tracking

Board analytics IDs (`gtmId`, `ga4MeasurementId`, `metaPixelId`,
`linkedInPartnerId`, optional LinkedIn conversion IDs) come from
`board.context().analytics`. The starter supports **two operator paths** —
use one destination per vendor to avoid double-counting:

| Path | When to use |
| --- | --- |
| **Google Tag Manager** | One container ID; wire GA4, Meta, LinkedIn, Google Ads, and custom tags inside GTM |
| **Direct Meta / LinkedIn** | Pixel ID and/or LinkedIn Partner ID only — native `fbq` / `lintrk` at the same moments |

GTM loads on public pages **and** auth/onboarding routes (`/auth/*`,
verify-email, resume onboarding). When cookie consent is required, conversion
events still push to `window.dataLayer` immediately; GTM and pixels load only
after accept, then flush any queued pixel calls.

### Standard `dataLayer` conversion events

Use these as **Custom Event** triggers in GTM (field names match hosted Cavuno
boards — [operator docs](https://cavuno.com/docs/analytics/connect-google-tag-manager)):

| Event | When | Key fields |
| --- | --- | --- |
| `sign_up` | Account created (password/OAuth/magic-link). Password: auto-redirect to verify-email landing with `cavuno_auth*`, not after OTP | `method`, `board_slug` |
| `login` | Successful sign-in | `method`, `board_slug` |
| `apply_click` | Apply flow opened (not the registration wall) | `job_id`, `job_slug`, `company_slug`, `apply_type`, `board_slug` |
| `apply_submit` | Native application submitted | `job_id`, `application_id`, `job_slug`, `company_slug`, `board_slug` |
| `job_alert_subscribe` | Job alert confirmed (double opt-in) | `board_slug`, `source` (`confirm`) |

Auth methods: `password`, `google`, `linkedin`, `magic_link`.

---

## Customize it

This is a **customization template**, not a scaffold to rebuild. The contract
that keeps customizations safe:

- **[`AGENTS.md`](AGENTS.md)** — the rules any contributor (human or agent)
  follows: the customization surface, the layering, and the hard rules.
- **[`DESIGN.md`](DESIGN.md)** — the visual identity, design tokens, and the
  full component inventory (generated from `src/theme.css` + component source;
  never hand-edited).
- **[`docs/patterns/`](docs/patterns/README.md)** — page-level compositions.
  Select a pattern before composing a route; never hand-roll a
  listing/detail/form/empty surface.

It's standard [shadcn/ui](https://ui.shadcn.com) on Base UI: the primitives
under `src/components/ui/` are token-pure and the theme lives in the
shadcn-CLI-owned `src/theme.css`. So you can restyle the whole board with any
shadcn theme — pick one at [ui.shadcn.com/create](https://ui.shadcn.com/create)
and apply it, or run `pnpm run theme:apply`. The full theming workflow is in
[`docs/theming.md`](docs/theming.md) and [`DESIGN.md`](DESIGN.md).

---

## Deploy

The template targets **Cloudflare Workers** (config in
[`wrangler.jsonc`](wrangler.jsonc)).

```sh
pnpm run deploy            # builds, then `wrangler deploy`
```

Going live means pointing the frontend at your own board: a human operator
sets `CAVUNO_BOARD` (and `CAVUNO_API_URL`) in `wrangler.jsonc` before
deploying. That deploy-time grounding is the operator's job, not a code edit
— which is why [`AGENTS.md`](AGENTS.md) tells coding agents to never touch
these values.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wollemiahq/cavuno-tanstack-start-shadcn-job-board-template)

---

## Verify

Every change runs the verify triad before it lands (CI enforces the same):

```sh
pnpm run typecheck && pnpm test && pnpm run build
```

The full local gate, including formatting, design-artifact drift, and the Board
API conformance probe (`cavuno-board doctor`), is documented in
[`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/testing.md`](docs/testing.md).

## Performance

Core Web Vitals are held to budgets, not vibes. One command builds the
production bundle, serves it the way a CDN would (Brotli, warmed anonymous
HTML cache), and runs Lighthouse's default mobile lab — simulated Slow 4G,
4× CPU throttle — across ten routes (home, listings, and a discovered
job / company / salary / blog-post detail page):

```sh
pnpm run perf:lighthouse:check
```

The check fails unless every route meets, on every run:

| Budget | Target |
| --- | --- |
| Performance score | ≥ 90 worst run, ≥ 95 median |
| Largest Contentful Paint | ≤ 2.5 s |
| Total Blocking Time | ≤ 150 ms |
| Cumulative Layout Shift | ≤ 0.05 |

In practice the routes land well inside these: LCP around two seconds in the
mobile lab, with zero main-thread blocking and near-zero layout shift —
`<head>` and JSON-LD are composed server-side, so the LCP content arrives in
the HTML rather than behind a client fetch. Run it on your own fork; the
numbers are only worth what you can reproduce.

---

## Contributing & license

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — how to run, the verify triad, the
  `AGENTS.md` contract, and PR expectations.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — Contributor Covenant.
- **License:** [MIT](LICENSE).
