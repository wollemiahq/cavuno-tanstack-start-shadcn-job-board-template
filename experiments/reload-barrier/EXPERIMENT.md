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
1.49.0 with this patch applied. The lockfile `patch_hash` was `de01bade…` for
the barrier-only cut and is `39105847…` after experiment 2 (barrier + drain,
see below).

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

## Experiment 2: drain before clear (2026-09-12)

Branch merged with starter `origin/main` at `0e7261e` (PR 171, generators skip
unchanged writes) first. The harness writes files directly, so it still
triggers reloads.

### What changed in the patch

Same file, same patch. The barrier stays as it was. Added:

- **Request lease.** The `fetch` wrapper (default export only, not the init or
  export-types paths) creates a lease and sets it synchronously around the
  first hop into the import gate. The gate marks the lease active right after
  the barrier wait, in the same synchronous step as the barrier re-check, so
  no reload can slip in between. The lease ends when the response body stream
  closes, errors or is cancelled. Bodyless, WebSocket and thrown responses end
  it at once. The body is re-wrapped in a pull-through `ReadableStream` for
  this. "Finished" is body end, not `fetch` resolve. In this app `fetch`
  resolves only a few ms before the body closes, but body end is the boundary
  that still covers a streamed render.
- **Drain.** A `full-reload` still raises the barrier synchronously. It then
  waits for active leases to reach zero, and only then calls the HMR handler
  (clear + re-import). New requests queue at the barrier as before.
- **Leased imports skip the barrier.** Without this, a leased request that
  reaches the gate after a reload has started would wait on a barrier that is
  waiting on the request. In practice the entry import runs once per request,
  so this is a guard.
- **Timeout.** The drain gives up after `EXP_RELOAD_DRAIN_TIMEOUT_MS` (default
  5000 ms) and logs `drain-timeout` with the stuck leases (seq, path, age).
  This covers long streams and renders that fetch this dev server, which would
  queue at the barrier while holding a lease.
- **Cross-context wake-up.** The lease ends in the request's worker context.
  The drain waits in the runner DO. The last lease to end calls
  `notifyDrained` inside the DO through `runInRunnerObject`, wrapped in
  `ctx.waitUntil`. The first cut (v1) left out `waitUntil`. The request context
  could close before the wake-up RPC ran, so 2 of 17 drains in v1 slept until
  the 5 s timeout with 0 active leases (lost wake-up). v2 adds `waitUntil`.
  Across 91 v2 drains: 0 timeouts.
- **Experiment switches and logs** (strip before shipping): `EXP_RELOAD_DRAIN=off`
  gives barrier-only behaviour in the same build. New log lines:
  `drain-end`/`drain-timeout`, `drain-notify`, `hmr type=…` for payloads that
  are not full reloads (none seen in these runs), and `request-end` at body end
  with `end=close|cancel|error|nobody|throw`. New classes: `+drained` (a
  full-reload arrived while leased) and `+in-flight` (a graph clear actually
  started while leased).

`classify.mjs` now also reports last-write → last-reload-`end` latency, drain
waits and drain timeouts.

### Results

Port 3102, sandbox board, `BODY_CHARS=500000` for most runs, so full bodies
are saved for non-200s. "Barrier-only (same session)" is the same build with
`EXP_RELOAD_DRAIN=off`, run the same day on the merged branch.

| mode                     | baseline (09-11) | barrier (09-11) | barrier-only, same session | **barrier + drain** |
| ------------------------ | ---------------: | --------------: | -------------------------: | ------------------: |
| touch1: iterations failed |              2/5 |            9/25 |                       2/20 |           **1/100** |
| touch1: non-200           |             5/80 |          22/400 |                      5/320 |          **1/1600** |
| rewrite2: iterations failed |          20/20 |           16/60 |                      11/40 |            **0/30** |
| rewrite2: non-200         |           76/320 |          42/960 |                     27/640 |           **0/480** |
| rewrite3x (gap 25 ms)    |          not run |            0/10 |                    not run |            **0/20** |
| later batches non-200    |           28/240 |           0/720 |                      0/720 |          **0/1800** |

- `check-preview-hmr.mjs` (10 real `theme.css` edits plus generators): 80/80
  200 (`drain-check-preview-hmr.txt`).
- Idle p50, 3 runs (`drain-idle.txt`): `/` 83–92 ms, `/jobs` 78–85 ms. Barrier
  only was 80–82 and 81–85, baseline 81 and 86. That is within run-to-run
  noise. One run had a `/` p90 of 1.2 s from two slow upstream calls.
- Aborted clients: 5 requests cut off by curl after 30 ms ended their leases
  with `end=cancel` once the render finished. The next reload drained with
  `active=0`.
- Deadlocks: none. The v1 lost wake-up doubled as a test of the timeout bound.
  The reload went ahead at 5.0 s, and the 4 requests queued at the barrier then
  returned 200.

**Reload delay.** The drain holds a full reload only while a render is in
flight. There were 91 drains across the 150 drain iterations.

| series                  | drain wait p50 / p90 / max | last write → reload end p50 / p90 / max |
| ----------------------- | -------------------------: | --------------------------------------: |
| drain touch1 (100 it)   |     179 / 828 / 3371 ms    |                   523 / 1625 / 4231 ms |
| barrier-only touch1 (20) |                         — |                     440 / 580 / 692 ms |
| drain rewrite2 (30 it)  |     169 / 662 / 1843 ms    |                   738 / 2326 / 3811 ms |
| barrier-only rewrite2 (40) |                       — |                  1043 / 2704 / 8397 ms |

The added delay is the rest of the in-flight render: about 0.2 s typical,
0.8 s at p90, 3.4 s worst. A render that overlaps a reload is slow, because
its lazy imports fetch freshly invalidated transforms. For a single edit this
moves reload-end p50 by about +80 ms and p90 by about +1 s. The rewrite2
latencies overlap and are dominated by noise.

### Residual

**No `+in-flight` failures in 150 drain iterations.** The getRequestHeader
and Invalid-hook-call class is gone. In the same-session barrier-only control,
every one of its 32 failures was `idle+drained+in-flight`, with those two
errors.

One failure remains, in `drain-touch1-a` iteration 4: `/` returned 500 with
`(intermediate value) is not a function`, class `idle+drained`. A reload
arrived during the render, the drain held the clear until 139 ms after the
render ended, and no clear overlapped it. That signature does not appear in
any control run. It happened in the first run after a restart that
re-optimised deps (lockfile changed by `patch-commit`). That run used the
default 2.5 KB body tail, so there is no stack. It did not recur in the next
90 touch1 iterations (1 600 requests with full bodies saved) or in 30 rewrite2
iterations. It may be an optimizer-settling flake, or a render reading a module
whose server-side transform the file change had just invalidated. Neither is
proven.

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

**Updated 2026-09-12, after experiment 2: ship barrier + drain as a dev-only
pnpm patch.** It meets the bar with one caveat. rewrite2 dropped to 0/30
(barrier-only in the same session: 11/40). touch1 dropped to 1/100
(barrier-only: 2/20). The one touch1 failure is not the reload race: no graph
clear overlapped it, and its signature appears in no control. No deadlocks.
The timeout never fired in v2. The reload delay is the rest of the in-flight
render, p50 about 0.2 s and worst 3.4 s, and only when a render is in flight.
Idle latency is unchanged.

Before shipping:

1. Strip the `[DEBUG-reload-epoch]` logs (keep one warning on
   `drain-timeout`), the `EXP_RELOAD_BARRIER` and `EXP_RELOAD_DRAIN` switches,
   and the request classes. The lease, the body wrapper, the `waitUntil`
   wake-up and the timeout are functional, so they stay.
2. Decide how leases treat long-lived responses. A `text/event-stream` or
   another never-ending body would hold a lease, so every reload would wait
   the full 5 s timeout while it is open. The starter serves none today.
   Exempting `text/event-stream` is a one-line guard.
3. Watch the builder preview for the `(intermediate value) is not a function`
   signature (see Residual). If it recurs, capture the full body and stack.
4. Still file the upstream issue (below). This patch is a stopgap.

Kept for the record, the recommendation after experiment 1:

**Do not ship the barrier alone as the fix.** It is correct and cheap:
nothing leaks past it, it adds no idle latency, and it causes no deadlock. It
removes every failure for requests that arrive during a reload, and makes
multi-reload bursts settle cleanly (later batches 28 → 0). But the class it
leaves behind, renders already running when the reload lands, is the **only**
class a single-file edit produces. Single edits are the common builder and
preview case, and touch1 is 9/25 iterations failing either way.

To close the remaining failures:

1. **Drain before clear.** Done in experiment 2 above.
2. **Upstream issue to cloudflare/workers-sdk (vite-plugin), file now.** Include
   the repro (harness `touch1`/`rewrite2`), the code path (requests enter
   through `runInRunnerObject` with no exclusion against the WebSocket
   `full-reload` handler, which clears `evaluatedModules` in place), and both
   symptoms. The durable fix belongs there: build a new graph generation and
   publish it atomically, while in-flight requests keep their own generation.
   Clearing a shared graph in place cannot give a render a consistent view.
   The barrier and drain patch are the local stopgap. 1.54.6's runner worker
   is byte-identical to 1.49.0 on this path (see the diagnosis).
3. **Remove the product trigger regardless.** Done upstream in starter PR 171:
   generators now skip unchanged writes.
