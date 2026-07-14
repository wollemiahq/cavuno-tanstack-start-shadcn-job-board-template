# Source provenance and baseline

This standalone repository began as a tracked-content copy of the Cavuno
Untitled UI job board template. It has fresh Git history and does not share
Git metadata with the source repository.

## Current release state

The source information below is a historical provenance record, not a
description of the current design system. The current starter is shadcn-only:
all release surfaces compose the owned Rhea/Base UI source in
`src/components/ui/`, theme through `src/theme.css`, and use semantic shadcn
tokens. The inherited Untitled UI components, utilities, and CSS compatibility
layer have been removed.

## Source snapshot

| Field | Value |
|---|---|
| Source repository | `https://github.com/wollemiahq/cavuno-job-board-template-untitled-ui.git` |
| Source commit | `b3716b39c535a02af8d30326e085e1a5dada6ead` |
| Source branch | `main` |
| Source status | Clean and tracking `origin/main` |
| Snapshot date | 2026-07-13 |
| Copy method | `git archive` of the recorded commit |

The archive contained tracked files only. It therefore excluded the source
repository’s `.git`, `node_modules`, build output, caches, ignored `.dev.vars`
files, and all other untracked or ignored local state. The source checkout had
an ignored local `.dev.vars`; it was neither read into this repository nor
copied. Baseline browser gates used a clean archive with the committed sandbox
configuration.

## Recorded toolchain

| Tool | Version |
|---|---|
| Node.js | `24.14.1` |
| pnpm | `11.10.0` |
| Git | `2.47.0` |
| Vite+ | `0.2.2` |
| Vite | `8.1.3` (`vp` bundles `8.1.2`) |
| Wrangler | `4.100.0` |
| TypeScript | `7.0.2` |
| Vitest | `4.1.9` |

## Untouched source baseline

| Gate | Result |
|---|---|
| `pnpm run typecheck` | Pass — zero TypeScript errors |
| `pnpm test` | Pass — 39 files and 302 tests |
| `pnpm run build` | Pass |
| `pnpm run gen:design -- --check` | Pass — generated design artifacts match their sources |
| `pnpm exec cavuno-board doctor --frontend http://localhost:4173 --sandbox` | Pass — 15 passed, 0 failed, 2 operator-only skips |
| `node scripts/pseudo-locale-gate.mjs http://localhost:4173` | Pass |

The doctor skips were `static.skills` (no optional installed agent-skill
directory) and `write.email` (operator-owned `RESEND_API_KEY` not present).
All available Tier 1, Tier 2, and Tier 3 sandbox probes passed.

## Approved initial differences

Before the first commit, the copy changed only repository identity in
`package.json`, `README.md`, and `wrangler.jsonc`, plus this provenance record.
At that bootstrap point the existing Untitled UI implementation remained
intentionally unchanged; later tickets replaced it with the current shadcn-only
release boundary described above.

A recursive comparison against a fresh extraction of the source archive found
no other tracked-content differences. Local verification generated only ignored
artifacts (`node_modules`, `dist`, `.wrangler`, `src/paraglide`, and Inlang
metadata); none are part of the initial commit.

## Historical bootstrap destination verification

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass — 465 packages reused, 0 downloaded |
| `pnpm run typecheck` | Pass — zero TypeScript errors |
| `pnpm test` | Pass — 39 files and 302 tests |
| `pnpm run build` | Pass |
| `pnpm run gen:design -- --check` | Pass — generated design artifacts match their sources |
| Structural CI scans | Pass — no forbidden legacy-stack or Untitled UI PRO references |
| Zero-config preview | Pass — home title is `12 Jobs | Sandbox` |
| `pnpm exec cavuno-board doctor --frontend http://localhost:4173 --sandbox` | Pass — 15 passed, 0 failed, 2 operator-only skips |
| `node scripts/pseudo-locale-gate.mjs http://localhost:4173` | Pass |

The destination doctor produced the same two expected operator-only skips as
the source baseline. No application, design-system, route, API, or data-model
behavior was changed by this repository bootstrap.

## Current release reconciliation

The bootstrap verification above is deliberately historical. Work after the
fresh-history copy transformed the presentation and product orchestration while
preserving the Cavuno Board API as the data and behavior engine. The table
categorizes the intended difference classes under the allowed CAV-512
classifications; it does not replace an exact diff:

| Change family | Classification | Current decision |
|---|---|---|
| Standalone name, fresh history, package metadata, README, Wrangler worker name, and remote URL | Repository identity | The template is an independent repository; the source snapshot remains recorded above. |
| Rhea preset, Base UI primitives, Geist, Lucide, semantic shadcn tokens, Typeset, layout primitives, page patterns, cards, forms, feedback, and responsive shells | Presentation | The inherited Untitled UI presentation layer was removed. `src/components/ui/` and `src/theme.css` are the single owned design-system boundary. |
| Compact header search; distinct jobs, companies, talent, and blog query ownership; two-field job search; filter rows; URL-backed selections; master/detail panes; full-page canonical fallbacks | Required search orchestration | The Board API remains the source of records. The starter owns routing and selection state needed for the approved LinkedIn/Indeed-style discovery experience. |
| Jobs, companies, talent, salaries, content, candidate account, posting, employer, checkout, pipeline, and message surfaces | Presentation | Existing capabilities are recomposed with the owned shadcn components; server operations continue through `@cavuno/board`. |
| Floating messaging launcher and conversations, dedicated two-column messaging page, bottom-right placement, persistent apply/save actions, result-selection skeletons, optional ad rails, and resettable search empty states | Explicitly approved change | These interaction changes were approved during the CAV-500 design interview and implemented as template-owned UI behavior. |
| Search URLs, canonical detail URLs, structured data, sitemaps, robots, RSS, embeds, and localization chrome | Required search orchestration | Public URLs and SEO semantics remain explicit contracts; presentation changes do not create parallel data models. |
| Removal of Untitled UI packages, helpers, CSS compatibility tokens, and parallel component directories | Presentation | CAV-511 contracted the release to one shadcn design system. `src/shadcn-only-release.test.ts` prevents the retired layer from returning. |
| Version-matched `@cavuno/board` skills under `.claude/skills` | Repository identity | The standalone carries the SDK's own agent instructions so LLM changes use the installed API contract; `cavuno-board setup` regenerates them after SDK upgrades. |

The release history makes those families reviewable commit by commit:

| Commit | Accounted change |
|---|---|
| `c4a5bc4` | Standalone repository bootstrap and identity |
| `292b3bd` | Rhea/Base UI theme and component foundation |
| `c2fce20` | Public job-board design-system composition |
| `bb882f4` | Jobs search and master/detail orchestration |
| `c8dc97a` | Company search and master/detail orchestration |
| `3be9804` | Talent search and master/detail orchestration |
| `fa0e4b4` | Public content and contextual search surfaces |
| `9e70bd0` | Candidate self-service presentation |
| `6705430` | Dedicated and floating messaging experiences |
| `c5c3d63` | Employer workspace plus final shadcn-only contraction |

This ledger categorizes the intended difference classes.
Exact file-and-behavior reconciliation against the source archive remains open,
and this is not a claim that the CAV-512 delivery gate has passed. Current
doctor, fresh-clone, screenshot, interaction, and full-surface evidence remains
governed by `docs/publish-gate.md`.
