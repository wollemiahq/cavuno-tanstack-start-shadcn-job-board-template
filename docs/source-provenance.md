# Source provenance and baseline

This standalone repository began as a tracked-content copy of the Cavuno
Untitled UI job board template. It has fresh Git history and does not share
Git metadata with the source repository.

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

Before the first commit, the copy changes only repository identity in
`package.json`, `README.md`, and `wrangler.jsonc`, plus this provenance record.
The existing Untitled UI implementation remains intentionally unchanged; its
replacement is handled by later tickets.

A recursive comparison against a fresh extraction of the source archive found
no other tracked-content differences. Local verification generated only ignored
artifacts (`node_modules`, `dist`, `.wrangler`, `src/paraglide`, and Inlang
metadata); none are part of the initial commit.

## Standalone destination verification

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
