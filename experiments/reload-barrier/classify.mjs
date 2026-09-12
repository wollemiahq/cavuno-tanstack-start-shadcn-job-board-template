// Classify every non-200 in harness result files using the patch's
// [DEBUG-reload-epoch] request-end lines, and pull the error out of the
// saved response body (harness saves the body head for non-200s).
//
// Usage: node experiments/reload-barrier/classify.mjs results/<file>.json ...
//
// Classes (from the patched runner's request-end line):
//   idle+in-flight  entry import ran with no reload pending, then a reload
//                   began before the response finished -> render straddled a
//                   graph clear. Not protectable by an entry barrier.
//   gated           entry import waited on the barrier (a reload was pending
//                   when the request arrived). A failure here = patch bug.
//   idle            no reload pending at import, none began before the end.
//                   A failure here = something other than the reload race.
//   gated+in-flight waited, then another reload began mid-render.
// Since the drain patch (request-end is logged when the body stream ends):
//   +drained        a full-reload payload arrived while the request was
//                   leased. With the drain on, the clear waited for it.
//   +in-flight      a graph clear actually started while the request was
//                   leased (drain off, or the drain timed out).
//   So `idle+drained` = protected by the drain; `idle+drained+in-flight` =
//   the old in-flight class.
// Also flags any request import that started while a reload was still
// pending after the wait (barrier slipped = patch bug), and reports
// last-write -> last-reload-end latency, drain waits, and drain timeouts.
import { readFileSync } from 'node:fs';

function errorOf(body = '') {
  if (/Invalid hook call/.test(body)) return 'Invalid hook call';
  const m = body.match(/new Error\("([^"]{0,160})/);
  if (m) return m[1];
  const j = body.match(/"message":"([^"]{0,160})"/);
  if (j) return `json: ${j[1]}`;
  if (/useContext/.test(body)) return 'useContext (null dispatcher)';
  return body ? '(body without error marker; truncated?)' : '(no body saved)';
}

const t = (l) => Number(l.match(/ t=(\d+)/)?.[1]);
function stats(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, p50: q(0.5), p90: q(0.9), max: s.at(-1) };
}

for (const file of process.argv.slice(2)) {
  const { summary, results } = JSON.parse(readFileSync(file, 'utf8'));
  const byClass = {};
  const errors = {};
  let slipped = 0;
  let epochLogged = 0;
  // Reload latency: last write -> last reload `end` of the iteration.
  const reloadEndMs = [];
  // Drain: time each reload waited for in-flight requests before clearing.
  const drainMs = [];
  let drainTimeouts = 0;
  for (const r of results) {
    const ends = (r.epochLog ?? []).filter((l) =>
      /\] end epoch=/.test(l),
    );
    if (ends.length && r.writesDoneAt)
      reloadEndMs.push(t(ends.at(-1)) - r.writesDoneAt);
    for (const l of r.epochLog ?? []) {
      const d = l.match(/drain-(end|timeout) .*waitedMs=(\d+)/);
      if (d) {
        drainMs.push(Number(d[2]));
        if (d[1] === 'timeout') drainTimeouts++;
      }
    }
    for (const l of r.epochLog ?? []) {
      epochLogged++;
      const end = l.match(/request-end .*status=(\d+) class=(\S+)/);
      if (end && end[1] !== '200') byClass[end[2]] = (byClass[end[2]] ?? 0) + 1;
      const imp = l.match(/import-start seq=req-\S+ .* pending=(\d+) waitedMs/);
      // Expected > 0 only in the barrier-off control.
      if (imp && Number(imp[1]) > 0) slipped++;
    }
    for (const q of r.requests) {
      if (q.status === 200) continue;
      const e = `${q.path} ${q.status}: ${q.error ?? errorOf(q.body)}`;
      errors[e] = (errors[e] ?? 0) + 1;
    }
  }
  console.log(
    JSON.stringify(
      {
        file,
        mode: summary.mode,
        failingIterations: `${summary.failingIterations}/${summary.iterations}`,
        non200: summary.firstBatchNon200 + summary.laterBatchNon200,
        hookLines: summary.totalHookLines,
        non200ByClass: epochLogged
          ? byClass
          : 'no epoch log (uninstrumented run)',
        requestImportsStartedWhileReloadPending: slipped,
        lastWriteToReloadEndMs: stats(reloadEndMs),
        drainWaitMs: stats(drainMs),
        drainTimeouts,
        errors,
      },
      null,
      1,
    ),
  );
}
