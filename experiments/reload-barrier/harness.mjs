// Reload-race harness for the Cloudflare Vite runner (local dev only).
//
// Usage:
//   ORIGIN=http://localhost:3102 LOG=/path/to/dev.log \
//     node experiments/reload-barrier/harness.mjs <label> [iterations] [mode] [gapMs]
//
// mode:
//   rewrite2  (default) rewrite DESIGN.md and design/tokens.dtcg.json
//             byte-identically, back to back (two watcher events -> two
//             SSR `program reload`s), then immediately fire 4 concurrent GETs
//             (/, /jobs, /, /jobs).
//   rewriteN  rewrite the same two files `REWRITES` times (default 3) with gapMs
//             between writes.
//   touch1    single byte-identical rewrite of DESIGN.md (control).
//   none      no writes (control / idle).
//
// After the first request batch, three more batches follow (settle check),
// then the harness waits for the log to go quiet before the next iteration.
// Each iteration records statuses, ms, `program reload` delta, and
// Invalid hook call / useContext lines from the dev-server log.

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = process.env.ORIGIN ?? 'http://localhost:3102';
const logPath = process.env.LOG;
if (!logPath) throw new Error('LOG=<dev-server log> required');
const [label = 'run', iterArg = '10', mode = 'rewrite2', gapArg = '0'] =
  process.argv.slice(2);
const iterations = Number(iterArg);
const gapMs = Number(gapArg);
const rewrites = Number(process.env.REWRITES ?? 3);
const files = ['DESIGN.md', 'design/tokens.dtcg.json'].map((f) => root + f);
const originals = files.map((f) => readFileSync(f));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const BODY_CHARS = Number(process.env.BODY_CHARS ?? 2500);
function errorOf(body) {
  if (/Invalid hook call/.test(body)) return 'Invalid hook call';
  const tsr = body.match(/new Error\("([^"]{0,200})/);
  if (tsr) return tsr[1];
  const json = body.match(/"message":"([^"]{0,200})"/);
  if (json) return `json: ${json[1]}`;
  if (/useContext/.test(body)) return 'useContext (null dispatcher)';
  return '(no error marker in body)';
}

function logSize() {
  return statSync(logPath).size;
}
function logSince(offset) {
  const buf = readFileSync(logPath);
  return buf.subarray(offset).toString('utf8');
}
async function waitQuiet(quietMs = 1500, maxMs = 20000) {
  const start = Date.now();
  let last = logSize();
  let lastChange = Date.now();
  while (Date.now() - start < maxMs) {
    await pause(100);
    const s = logSize();
    if (s !== last) {
      last = s;
      lastChange = Date.now();
    } else if (Date.now() - lastChange >= quietMs) return;
  }
}
async function probe(batch) {
  return Promise.all(
    ['/', '/jobs', '/', '/jobs'].map(async (path) => {
      const t0 = Date.now();
      try {
        const r = await fetch(new URL(path, origin), {
          signal: AbortSignal.timeout(30000),
        });
        const body = await r.text();
        const rec = {
          batch,
          path,
          status: r.status,
          startedAt: t0,
          ms: Date.now() - t0,
          hookInBody: /Invalid hook call|useContext/.test(body),
        };
        // Keep the error of every non-200 on record. TanStack's SSR error
        // page puts the thrown Error in the dehydrated router state at the
        // END of the document, so extract from the full body and keep the tail.
        if (r.status !== 200) {
          rec.error = errorOf(body);
          rec.bodyTail = body.slice(-BODY_CHARS);
        }
        return rec;
      } catch (e) {
        return {
          batch,
          path,
          status: 0,
          startedAt: t0,
          ms: Date.now() - t0,
          error: String(e),
        };
      }
    }),
  );
}
async function trigger() {
  if (mode === 'none') return;
  if (mode === 'touch1') {
    writeFileSync(files[0], originals[0]);
    return;
  }
  const n = mode === 'rewriteN' ? rewrites : 1;
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < files.length; i++) {
      writeFileSync(files[i], originals[i]);
      if (gapMs > 0) await pause(gapMs);
    }
  }
}

const results = [];
await waitQuiet();
for (let it = 0; it < iterations; it++) {
  const offset = logSize();
  const triggerAt = Date.now();
  await trigger();
  const writesDoneAt = Date.now();
  const batches = [];
  batches.push(...(await probe(0)));
  for (let b = 1; b < 4; b++) batches.push(...(await probe(b)));
  await waitQuiet();
  const log = logSince(offset);
  const reloads = (log.match(/program reload/g) || []).length;
  const hookLines = (log.match(/Invalid hook call/g) || []).length;
  const useContextLines = (log.match(/useContext/g) || []).length;
  const epochLines = log
    .split('\n')
    .filter((l) => l.includes('[DEBUG-reload-epoch]'));
  const failed = batches.some((x) => x.status !== 200);
  const rec = {
    iteration: it,
    triggerAt,
    writesDoneAt,
    reloads,
    hookLines,
    useContextLines,
    firstBatch: batches.filter((x) => x.batch === 0).map((x) => x.status),
    laterBatches: batches.filter((x) => x.batch > 0).map((x) => x.status),
    requests: batches,
    epochLog: epochLines,
    // Failing iterations keep the non-epoch dev-server log for this window
    // (errors, stacks, `program reload`), capped to stay reviewable.
    ...(failed && {
      devLog: log
        .split('\n')
        .filter((l) => l.trim() && !l.includes('[DEBUG-reload-epoch]'))
        .slice(0, 400),
    }),
  };
  results.push(rec);
  console.log(
    JSON.stringify({
      it,
      reloads,
      hookLines,
      first: rec.firstBatch,
      later: rec.laterBatches,
      firstMs: batches.filter((x) => x.batch === 0).map((x) => x.ms),
    }),
  );
}
const summary = {
  label,
  mode,
  gapMs,
  iterations,
  at: new Date().toISOString(),
  failingIterations: results.filter((r) =>
    [...r.firstBatch, ...r.laterBatches].some((s) => s !== 200),
  ).length,
  firstBatchNon200: results
    .flatMap((r) => r.firstBatch)
    .filter((s) => s !== 200).length,
  laterBatchNon200: results
    .flatMap((r) => r.laterBatches)
    .filter((s) => s !== 200).length,
  totalReloads: results.reduce((a, r) => a + r.reloads, 0),
  totalHookLines: results.reduce((a, r) => a + r.hookLines, 0),
};
console.log(JSON.stringify(summary));
writeFileSync(
  `${process.env.OUT_DIR ?? root + 'experiments/reload-barrier/results'}/${label}.json`,
  JSON.stringify({ summary, results }, null, 2),
);
