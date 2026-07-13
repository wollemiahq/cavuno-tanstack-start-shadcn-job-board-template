# Publish gate — CAV-493

- **Date:** 2026-07-11
- **Branch:** `feat/cav-493-publish-gate` (base `feat/cav-492-stress-log`)
- **Purpose:** record the publish-readiness gate run. The public flip
  itself is a human decision — everything below is prepared and recorded,
  not flipped.

## Machine gates (run + recorded)

| Item | Command | Result |
|---|---|---|
| Typecheck | `pnpm run typecheck` | **PASS** — `tsc --noEmit`, 0 errors |
| Full suite | `pnpm test` | **PASS** — 23 files, **127 tests** passed |
| Build | `pnpm run build` | **PASS** — `vp build` ✓ built |
| Design artifacts | `pnpm run gen:design -- --check` | **PASS** — DESIGN.md + DTCG export match sources |
| Pseudo-locale gate | `node scripts/pseudo-locale-gate.mjs http://localhost:4173` | **PASS** — `/en-XA/`, `/jobs`, `/companies`, `/blog` all bracketed + noindex; `/de/` canonical→base, sitemap clean |
| CI grep gate 1 (legacy primitive-stack) | `grep -rnE "@base-ui/react\|lucide-react\|components/ui/" src/` | **PASS** — no matches (grep exit 1) |
| CI grep gate 2 (Untitled UI PRO namespace) | `grep -rnE "untitledui\.com/react/pro\|@untitledui-pro" src/` | **PASS** — no matches (grep exit 1) |

## Fresh-clone smoke (run + recorded)

Cloned the pushed branch to a clean temp dir with **no `.dev.vars`**, so the
committed `wrangler.jsonc` sandbox default (`pk_c2f66367…`, CAV-490) is what
renders.

```sh
git clone --branch feat/cav-493-publish-gate --single-branch \
  https://github.com/wollemiahq/cavuno-job-board-template-untitled-ui.git smoke
cd smoke
pnpm i --frozen-lockfile   # PASS — frozen lockfile resolved, no drift
pnpm run build             # PASS — vp build ✓
pnpm exec vp preview --port 4183 &
curl -s http://localhost:4183/ | grep '<title>'
#   → <title>12 Jobs | Sandbox</title>
```

**Result: PASS** — a zero-config fresh clone builds and serves the live
sandbox board (title `12 Jobs | Sandbox`), confirming the "clone → install →
run → live job board" quickstart is true of the repo as pushed.

## Non-local / prior-run gates (noted, not re-run)

- **Doctor (`npx cavuno-board doctor`, all three tiers):** green on CI for
  every stack PR (CAV-480…492). Requires the built worker + sandbox write
  probes wired in `ci.yml`; not re-run locally here.
- **Visual review:** covered by the incremental per-ticket screenshots
  attached to CAV-480…492, plus the full real-data stress pass
  (`docs/stress-log.md`: production robotics board, 937 jobs, light + dark,
  CJK, sparse profiles). The CAV-493 hero capture (`docs/screenshot-home.png`,
  sandbox, 1280×800) is committed on this branch.

## Operator-gated (CANNOT be done by the agent — human action required)

These are the actual publish flip and its side effects. Listed with exact
commands where applicable.

1. **Make the repo public + MIT effective.** The `LICENSE` file (MIT,
   © 2026 Wollemia) is committed on this branch; the license only takes
   legal effect once the repo is public. Flip via GitHub repo settings.

2. **GitHub topics.** Cannot be set from the repo tree. Run:

   ```sh
   gh repo edit wollemiahq/cavuno-job-board-template-untitled-ui \
     --add-topic untitled-ui \
     --add-topic job-board \
     --add-topic template \
     --add-topic react \
     --add-topic tailwindcss
   ```

3. **Demo deploy.** `wrangler deploy --env demo` (the production Robotics
   Engineer Jobs board, `pk_d9ce40a1…`). Needs `wrangler` auth
   (Cloudflare account login).

4. **`cavuno-update-action` secret.** The weekly update workflow
   (`.github/workflows/update.yaml`) needs its token/secret provisioned in
   repo settings before it can open PRs.

5. **PR-stack merges.** CAV-480…493 merge in order into `main` once each is
   approved. This PR (CAV-493) bases on `feat/cav-492-stress-log`; do not
   merge ahead of its base.
