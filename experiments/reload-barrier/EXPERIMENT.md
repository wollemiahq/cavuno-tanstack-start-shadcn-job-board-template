# Reload barrier in the Cloudflare Vite SSR runner

Local dev-server experiment. Nothing here changes production builds: the patch
touches only `dist/workers/runner-worker/index.js` of
`@cloudflare/vite-plugin@1.49.0`, which runs only under `vite dev`.

## Question

Under `vite dev`, a burst of watcher events makes SSR requests return 500
(`Invalid hook call` / `Cannot read properties of null (reading 'useContext')`).
The working model: HTTP request imports enter the shared module runner through
`__VITE_ENVIRONMENT_RUNNER_IMPORT__` → `runInRunnerObject` → `executeCallback`
with no lock against HMR. A `full-reload` payload clears the shared
`EvaluatedModules` graph and re-imports the entrypoints. A request can then mix
module generations, React's dispatcher is null, and the render throws.

Does a barrier that holds new request imports until every pending full reload
has finished remove those 500s?

## The patch

`patches/@cloudflare__vite-plugin@1.49.0.patch`, registered under
`patchedDependencies` in `pnpm-workspace.yaml` (lockfile updated).

- **Barrier.** When a `full-reload` payload arrives on the runner WebSocket, the
  listener replaces `reloadBarrier` synchronously, before it calls the HMR
  handler: `reloadBarrier = Promise.all([reloadBarrier, handled])`. `handled`
  resolves in a `finally` once `onMessage(payload)` settles. `onMessage` is
  Vite's queued HMR handler, so it returns the promise for this payload's
  clear-and-re-import. Each new barrier includes the previous one, so
  back-to-back reloads chain. Other payload types go straight through.
- **Request side.** `__VITE_ENVIRONMENT_RUNNER_IMPORT__` awaits
  `awaitReloadBarrier()` inside the runner Durable Object before
  `runner.import(id)`. The helper loops until the barrier it awaited is still
  the current one, so a reload that starts during the wait is also waited for.
  Nothing can be missed between reading and awaiting the barrier.
- **No self-deadlock.** The HMR full-reload handler re-imports entrypoints with
  `runner.import(url)` directly, and module-internal dynamic imports do the
  same. Neither path goes through the gated global, so the reload never waits
  on itself.
- **No sleeps, no retries.** The patch only awaits promises.
- **Experiment-only extras**, to strip before shipping:
  - `EXP_RELOAD_BARRIER=off` in `.dev.vars` turns the wait off but keeps the
    logging. This is the instrumented control.
  - `[DEBUG-reload-epoch]` logs: `begin`/`end` for each reload (with epoch and
    pending count), `import-start`/`import-end` for each request import (with
    epoch and pending count at the call, and the wait time).
  - A `fetch` wrapper that logs `request-start`/`request-end` with the status
    and a class:
    - `gated`: a reload was pending when the import was called.
    - `idle`: no reload was pending.
    - `+in-flight`: a reload began after the import and before the response
      resolved.

Checked on 2026-09-12: the installed `node_modules` file matches pristine
1.49.0 with this patch applied, and the lockfile `patch_hash` is
`de01bade…`.

## Method

The dev server runs on port 3102 (`pnpm exec vp dev --port 3102 --strictPort`,
unsandboxed, sandbox board key). Its log goes to a file.

```sh
ORIGIN=http://localhost:3102 LOG=/path/to/dev.log \
  node experiments/reload-barrier/harness.mjs <label> [iterations] [mode] [gapMs]
node experiments/reload-barrier/classify.mjs experiments/reload-barrier/results/<label>.json
ORIGIN=http://localhost:3102 node experiments/reload-barrier/idle-latency.mjs 20
```

Harness modes. Every write is byte-identical, so the repo stays clean:

| mode       | trigger                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------- |
| `rewrite2` | rewrite `DESIGN.md` and `design/tokens.dtcg.json` back to back: two SSR `program reload`s |
| `rewriteN` | the same two files `REWRITES` times (default 3), `gapMs` apart                           |
| `touch1`   | rewrite `DESIGN.md` once: one reload                                                     |
| `none`     | no writes (control)                                                                      |

Each iteration fires 4 concurrent GETs (`/`, `/jobs`, `/`, `/jobs`) right after
the writes. Three more batches of 4 follow. The harness then waits until the
log is quiet. For each run it records statuses, latencies, `program reload`
count, hook-error log lines, and the `[DEBUG-reload-epoch]` lines. Since this
session, it also stores `error` (taken from the full response body) and the
body tail for every non-200, plus the non-epoch dev log for failing iterations.

`classify.mjs` groups each non-200 by its `request-end` class and error. It
also counts request imports that started while a reload was still pending
after the wait. That count should be 0 with the barrier on. Anything above 0
means the barrier leaked.

## Results

A "request" is one GET. Each iteration makes 16 requests: 4 in the first batch
and 12 in the later batches.

| run                                 | iterations failed |      non-200 | first batch | later batches | hook log lines |
| ----------------------------------- | ----------------: | -----------: | ----------: | ------------: | -------------: |
| baseline rewrite2 (a+b)             |             20/20 |       76/320 |       48/80 |        28/240 |             66 |
| instrumented, barrier off, rewrite2 |              9/10 |       36/160 |       24/40 |        12/120 |             25 |
| **patched rewrite2 (a–f)**          |         **16/60** |   **42/960** |  **42/240** |     **0/720** |             11 |
| patched rewrite3x (gap 25 ms)       |              0/10 |        0/160 |        0/40 |         0/120 |              0 |
| baseline touch1                     |               2/5 |         5/80 |        5/20 |          0/60 |              0 |
| patched touch1 (3 runs)             |              9/25 |       22/400 |      22/100 |         0/300 |              4 |
| baseline none                       |               0/5 |         0/80 |           — |             — |              0 |

Patched rewrite2 per run: a 3/10 (7), b 0/10 (0), c 2/10 (5), d 5/10 (14),
e 4/10 (12), f 2/10 (4). The rate depends on timing: 0–50% of iterations per
run, about 27% pooled. `patched-v1-rewrite2-a.json` came from an earlier cut of
the patch (3/10, 9 non-200) and is kept for the record.

- Idle latency is unchanged. Baseline p50 was 80.9 ms (`/`) and 86 ms (`/jobs`).
  Patched p50 was 80.3–82 ms and 81–85 ms (`baseline-idle.txt`,
  `patched-idle.txt`).
- `scripts/check-preview-hmr.mjs` under the patch returned 80/80 200
  (`patched-check-preview-hmr.txt`).
- Reload counts match the writes (20 per rewrite2 run, 1 per touch1 iteration).
  The barrier does not add or merge reloads.

## Findings

### (a) What the touch1 500s are

These are the same failure as the rewrite2 500s, not a separate one. The
earlier "zero hook lines" came from a small sample that only produced the
second symptom below. With response bodies captured (`patched-touch1-bodies`,
`patched-touch1-errors`), single-reload 500s show two symptoms of one race:

1. **`(0 , __vite_ssr_import_0__.getRequestHeader) is not a function`**. This
   is most of the touch1 500s. The SSR render still completes, and TanStack
   Router's route `errorComponent` renders "Something went wrong" with status
   500. The thrown error only appears in the dehydrated router state at the end
   of the HTML (`matches[].e = new Error(...)`). It is never logged to the dev
   console, which is why the log-only harness missed it.
   `src/lib/data-source.server.ts` and the other server modules call
   `getRequestHeader` from `@tanstack/react-start/server` through a thunk. The
   request reads that module's namespace while the reload's entrypoint
   re-import is still evaluating it, so its exports are only partly filled in.
   The thunk comment already notes the live 2026-09-09 sighting on preview
   hosts. The thunk only helps when the binding exists by call time. Here it
   does not.
2. **`{"status":500,"unhandled":true,"message":"HTTPError"}`**. This is the
   JSON body h3 returns for an unhandled render error. The dev log for the same
   iterations shows `Invalid hook call` and
   `TypeError: Cannot read properties of null (reading 'useContext')` as the
   `cause`. This is the React identity split from the diagnosis.

Every touch1 non-200 was classed `idle+in-flight`: 22/22 with the barrier on,
and the baseline has the same rate. The request's entry import finished before
the reload payload arrived, and the graph was cleared under its render.

### (b) Patched rewrite2 residual: in-flight renders, not a patch bug

Across all patched runs with epoch logs (rewrite2 a, c–f; touch1 ×2; 59
failing requests with epoch data):

- **All 59 failing requests were `idle+in-flight`.** None were `gated`. No
  request that waited on the barrier failed.
- **Request imports started while a reload was pending: 0 in every patched
  run.** In the barrier-off control the same count is 24, and those 24 are
  exactly its `gated` failures (24 of its 36 non-200). So the barrier removes
  the whole "arrived during a reload" class, and nothing leaks past it.
- Each failing request finished its entry import **2–84 ms before** the
  reload's `begin`. The watcher delay from `writeFileSync` to the runner
  receiving `full-reload` was 3–594 ms (median about 60 ms). A request fired
  right after a save can therefore start rendering on the old graph before the
  runner knows a reload is coming. When the reload lands, the graph is cleared
  under that render, and its later lazy imports (route chunks, server modules)
  resolve against a half-rebuilt graph. A barrier at request entry cannot
  protect this. The request did nothing wrong, and the barrier had nothing to
  wait for yet.
- Later batches were 0/720 non-200 with the patch, against 28/240 in the
  baseline. Every request that arrives once a reload is known now gets a
  consistent graph.

## Limits

- One machine, one board (sandbox key), two routes, 4-way concurrency. Rates
  vary a lot between runs (0/10 to 5/10), so treat the pooled rate as rough.
- The harness fires requests with no delay after the writes, which is close to
  worst case for the watcher-delay window. A browser reload that the HMR
  client triggers normally arrives after `full-reload`, so it lands in the
  gated class that the barrier fixes.
- The in-flight class comes from `pendingAtImportCall` and the epoch at
  response resolution. With streamed SSR, the body can keep rendering after
  `fetch` resolves, so a few "idle" requests could in fact be in-flight. That
  would not change the conclusion, since no failure was `idle` or `gated`.
- The mechanism for (a)(1), partly filled exports during concurrent
  evaluation, is inferred from the symptom and code reading. It was not
  traced module by module. Experiment 2 in the diagnosis (generation and React
  namespace IDs) would confirm it.
- `update` HMR payloads (accepted-module re-imports) are not gated. Only
  `full-reload` is.

## Recommendation

**Do not ship the barrier alone as the fix.** It is correct and cheap:
nothing leaks past it, it adds no idle latency, and it causes no deadlock. It
removes every failure for requests that arrive during a reload, and makes
multi-reload bursts settle cleanly (later batches 28 → 0). But the class it
leaves behind, renders already running when the reload lands, is the **only**
class a single-file edit produces. Single edits are the common builder and
preview case, and touch1 is 9/25 iterations failing either way.

To close the remaining failures:

1. **Drain before clear (next experiment, same patch).** Hold a request lease
   for the whole request, until the response body stream closes, not just the
   entry import. The `fetch` wrapper already sees every request. The
   full-reload listener then waits for active leases to reach zero before it
   calls `onMessage`. Requests that arrive in the meantime queue at the
   existing barrier. In-flight renders finish on a consistent old graph, and
   the client's reload fetches the new one.
   - The drain wait needs an upper bound. A long-lived stream, or a render that
     fetches the same dev server, would otherwise block reloads. Such a
     self-fetch would wait at the barrier while holding a lease, which is a
     deadlock.
   - The prediction is touch1 and rewrite2 both at 0/N. If that holds, ship it
     as a pnpm patch with the debug logging and the `EXP_RELOAD_BARRIER` switch
     removed. It stays dev-only, but the builder preview runs `vite dev`, so it
     matters for the product.
2. **Upstream issue to cloudflare/workers-sdk (vite-plugin), file now.** Include
   the repro (harness `touch1`/`rewrite2`), the code path (requests enter
   through `runInRunnerObject` with no exclusion against the WebSocket
   `full-reload` handler, which clears `evaluatedModules` in place), and both
   symptoms. The durable fix belongs there: build a new graph generation and
   publish it atomically, while in-flight requests keep their own generation.
   Clearing a shared graph in place cannot give a render a consistent view.
   The barrier and drain patch are the local stopgap. 1.54.6's runner worker
   is byte-identical to 1.49.0 on this path (see the diagnosis).
3. **Remove the product trigger regardless.** Make `gen-design` write each
   output only when its bytes change. False invalidations are what produce the
   two-reload burst in the builder flow.
