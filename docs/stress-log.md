# Real-data stress log — source baseline (CAV-492)

This is a dated record of the pre-shadcn source baseline. The current starter
uses the owned shadcn Rhea components and semantic tokens; historical component
and token names below describe what was tested at the time, not current guidance.

- **Date:** 2026-07-11
- **Board:** `pk_d9ce40a106227b615ec710de3f3d73dc` — the **production robotics
  board** (`937 jobs`, "Robotics Engineer Jobs"), grounded at
  `https://api.cavuno.com`.
- **Mode:** reads only. Every design surface was driven against the live,
  messy forager-ingested data (long titles with location suffixes, missing
  salaries, absent/white logos, 20-tag jobs, CJK 横浜市/名古屋市 locations,
  sparse company profiles). No applies/alerts/registrations were submitted
  against the real board — write-flow UI was observed, never submitted.
- **Harness:** `vp preview` → Playwright (Chromium), viewport **1280×1400**,
  light AND dark (`.dark` auto-applied from `prefers-color-scheme`). Each
  screenshot was inspected pixel-by-pixel for text overflow/clipping, card
  rhythm, empty-label artifacts, dark-mode contrast, container-edge breaks,
  and avatar-fallback quality.

## Findings

| Surface | Stress class | Defect | Fix |
|---|---|---|---|
| `/` and `/jobs` | long-title clamp, absent-salary, tag overflow, CJK | Long forager titles ("Future Opportunity -- Senior Robotic Algorithms and Controls Engineer") wrap to a 2-line clamp with a min-height so grid rhythm holds; jobs with no salary omit the comp line (no empty label); 20-tag jobs cap at 3 pills + honest `+N`; 横浜市 renders cleanly. | none needed (chassis S1/S2/S4/S6 fixes hold under real data) |
| Job detail — longest title (`intuitive/…future-opportunity----senior-…`) | long-title clamp, dark-mode contrast | Title + breadcrumb wrap without overflow. **The "Get alerts for jobs like this" panel failed dark contrast** (see dark-mode row). | fixed (this branch) |
| Job detail — no-salary (`path-robotics/senior-mechanical-engineer-…`) | absent-salary | Header/meta omit the salary row entirely, no `$—` placeholder. | none needed |
| Job detail — non-Latin location (Kanagawa jobs) | CJK | 横浜市 renders in header, breadcrumb, and card location with no tofu/clipping. | none needed |
| `/companies` | absent-logo, sparse-description | Sparse companies (GableTek, Bear Robotics) drop the description line and hold rhythm via equal-height grid rows; initials chips fall back cleanly; market-count pills wrap. | none needed |
| Company profile — `rivr` | avatar fallback | Full description, website link, jobs grid, "Similar companies" initials fallbacks (`L`, `N`) all clean. | none needed |
| Company profile — `gabletek` (sparse) | sparse-description, absent-logo | No `about` text → page goes straight to "Open jobs 11", no empty block; dark GableTek logo legible. | none needed |
| `/blog` | empty-collection | Board has **one** post (not empty). The single card sits left-aligned in the 3-col grid with no broken rhythm. The empty-state path was present but not triggered on this board. | none needed |
| `/salaries` + `/salaries/titles/robotics-engineer` | avatar fallback, data density | Index sections (companies/titles/skills/locations) and the detail (stat tiles, seniority "vs. board" table, FAQ) render clean with initials chips; both themes legible. | none needed |
| `/jobs/locations` | data density | Nested place hierarchy renders tall (≈12.7k px) but correct — no clipping/overflow. Intentional hosted-parity `buildHierarchy`; not restructured (would be a redesign, out of surgical scope). | logged (no fix) |
| `/jobs/locations/横浜市-kanagawa-japan` | CJK | "Jobs in Kanagawa, Japan" + 横浜市 card locations render correctly. | none needed |
| `/jobs/skills/lidar` | taxonomy, long-title | "LiDAR jobs" (43) — taxonomy present; forager numeric-prefixed titles ("1.83 Robotics Software Engineer: LiDAR Mapping") clamp fine. | none needed |
| Floating alert prompt (listing pages) | dark-mode contrast | Same panel as job detail — **failed dark contrast** (see below). | fixed (this branch) |
| **Dark-mode alert-signup panel (CAV-486)** | **dark-mode contrast** | The source-baseline subscribe panel used a directional background token whose dark value collapsed text and icon contrast. | **fixed in the historical baseline**. The current `AlertSignupForm` instead composes shadcn `Card`, `FieldError`, and `FieldDescription` with `border-primary bg-primary/5`. |
| White company logo (Alpine Eagle GmbH) | absent-logo | Company ships an **opaque-white JPG** logo (`…/kg2fdr87….jpg`, 200 OK, all-white pixels) → invisible on the white avatar chip, a glaring white box on dark. | logged (data-quality, out of scope) — an opaque-white raster can't be detected or mitigated in CSS without harming valid logos; the initials fallback only triggers when `logoUrl` is absent, and this URL resolves. Flagged for the ingest/enrichment layer, not markup. |

## Screenshots

The external CAV-492 run captured these artifacts (they are not stored in this
repository):

- Listings: `home-{light,dark}.png`, `jobs-{light,dark}.png`
- Job details: `job-longtitle-{light,dark}.png` (longest title, no salary),
  `job-mech-{light,dark}.png`
- Companies: `companies-{light,dark}.png`, `company-rivr-{light,dark}.png`,
  `company-gabletek-{light,dark}.png` (sparse)
- Blog / salaries: `blog-{light,dark}.png`, `salaries-{light,dark}.png`,
  `salary-detail-{light,dark}.png`
- Locations / skills: `loc-index-{light,dark}.png`,
  `loc-cjk-{light,dark}.png` (横浜市), `skill-lidar-{light,dark}.png`
- Alert-panel fix, before → after:
  `alert-panel-dark.png` (before) → `alert-panel-FIXED-dark.png` (after),
  `FIXED-listing-prompt-dark.png` (floating prompt, after)

## Classes covered

| Stress class | Outcome |
|---|---|
| long-title clamp | held (2-line clamp + min-height) — no fix |
| absent-salary | held (comp line omitted, no empty label) — no fix |
| absent-logo | initials fallback held; white-on-white raster **logged** (data) |
| tag overflow | held (3 pills + honest `+N`) — no fix |
| CJK | held (横浜市/名古屋市 render, no tofu) — no fix |
| empty-collection | not triggered (blog has 1 post; locations non-empty); empty-state path present |
| dark-mode contrast | **1 source-baseline defect fixed**; the current shadcn composition supersedes those retired tokens |

**Summary:** 1 presentational defect found and fixed (dark-mode contrast,
2 surfaces: inline panel + floating prompt); 2 items logged as out-of-scope
(a white-raster logo = data-quality; the locations-index density = intentional
hierarchy). All other stress classes were already hardened by the chassis
conversion and held under production robotics data.
