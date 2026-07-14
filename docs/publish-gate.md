# Private delivery gate — CAV-512

- **Date:** 2026-07-14
- **Repository:** `wollemiahq/cavuno-shadcn-ui-job-board-template`
- Repository visibility: **PRIVATE** — verified through GitHub metadata
- **Purpose:** record private release evidence and the remaining gates without
  authorizing a push, deploy, visibility change, announcement, or integration.

## Release hold

No push, deploy, public visibility change, announcement, ad-network
integration, GitHub topic update, or hosted-demo change is authorized by this
document. The repository must remain private until a person explicitly approves
a later public-release decision.

The current GitHub repository has no description, homepage, or topics. That is
deliberate during the private gate. Recommended metadata for a later approved
release is:

- Description: `A complete shadcn/ui job board template powered by Cavuno.`
- Topics: `shadcn-ui`, `job-board`, `template`, `tanstack`, `tailwindcss`,
  `react`, `base-ui`
- Homepage: leave blank until a public demo is separately approved and live

## Recorded machine evidence

| Gate | Result |
|---|---|
| `pnpm run typecheck` | **PASS** — zero TypeScript errors |
| `pnpm test` | **PASS** — 151 files, 757 tests |
| `pnpm run check` | **PASS** — 505 files correctly formatted and 485 files lint-clean |
| `pnpm run build` | **PASS** — production worker built |
| Generated design contract | **PASS** — byte-for-byte regeneration is covered by `src/design-contract.test.ts` |
| `pnpm exec shadcn add --all --dry-run --yes` | **PASS** — all 61 official outputs resolve as owned overwrites; zero files would be created |
| Sandbox write/read-back | **PASS** — a job created through `@cavuno/board` was retrieved by its returned slug and matched its ID and title |

These results describe the current private candidate. They do not imply a
public release or deployment.

## Doctor gate

Doctor: **not yet accepted**.

The latest local sandbox run reported **15 passed, 0 failed, 2 skipped**. The
version-matched SDK skill corpus is installed and `static.skills` now passes.
The remaining skips are the email probe without its operator-owned Resend key
and a theme probe that expects a `tokens.css` layout rather than this shadcn
starter's canonical `src/theme.css`. CAV-512 requires a no-skip result, so this
evidence is recorded honestly and the gate remains open. The next run must
retain its complete output and either exercise every suite or resolve the
doctor/template contract explicitly; a skipped suite must not be relabelled as
a pass.

## Fresh private clone

**Not yet accepted.** The finished CAV-510/CAV-511 candidate has not been
pushed, and `origin/main` does not yet contain it. After an explicit private
push is authorized, verify an exact remote commit in a clean temporary
directory with no `.dev.vars`:

```sh
git clone --branch <private-candidate-branch> --single-branch \
  https://github.com/wollemiahq/cavuno-shadcn-ui-job-board-template.git smoke
cd smoke
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run check
pnpm run gen:design -- --check
pnpm run build
pnpm exec shadcn add --all --dry-run --yes
```

Then serve that build using the committed sandbox default and run every Board
doctor tier. Record the exact commit, command output, and probe counts here.

## Screenshot and interaction evidence

**Not yet accepted.** `docs/screenshot-home.png` is now a current CAV-512
homepage capture. The source-baseline artifacts in `docs/stress-log.md` remain
explicitly historical. Current shadcn captures cover the homepage; selected
jobs in light, dark, mobile, desktop, 767px,
768px, and wide layouts; full job, companies, talent-empty, blog, posting,
authenticated messaging, employer entry, candidate settings, and embed
surfaces. The manifest and measured Back/Forward/refresh sequence are in
[`docs/release-evidence/README.md`](release-evidence/README.md).

Before this gate can close, the remaining screenshot matrix must cover:

- jobs no-results, loading, forced error, sponsored, and sticky-action states;
- populated left and right ad rails on a wide layout;
- dark-mode coverage beyond the selected jobs surface; and
- populated talent, verified candidate, employer-owned company, and sponsored
  fixture states that the current sandbox does not expose.

The remaining interaction record must additionally exercise keyboard navigation
with visible-focus traversal and reduced motion in a real browser.
Canonical-anchor, modified-click, Back/Forward, refresh-restoration, and
nested-pane contracts are covered by focused tests and the current browser
measurements. A missing sandbox fixture must not be relabelled as a visual
pass.

## Later public-release checklist

This section is preparation only. None of its actions are approved by CAV-512.
If a person later authorizes a public release:

1. Confirm every machine, doctor, fresh-clone, screenshot, interaction,
   provenance, spec, and completeness gate above is accepted.
2. Confirm the MIT copyright owner and repository metadata.
3. Review the committed sandbox default and every committed publishable token.
4. Decide separately whether a public demo should exist; do not infer a demo
   deployment from repository visibility.
5. Apply the approved description, topics, and homepage.
6. Change visibility, deploy, announce, or integrate advertising only through
   separately authorized operator actions, each with its own recorded outcome.
