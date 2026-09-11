// Idle latency: N sequential GETs per path with no file writes.
// ORIGIN=http://localhost:3102 node experiments/reload-barrier/idle-latency.mjs [n]
const origin = process.env.ORIGIN ?? 'http://localhost:3102';
const n = Number(process.argv[2] ?? 20);
const out = {};
for (const path of ['/', '/jobs']) {
  // one warm-up request, not counted
  await (await fetch(new URL(path, origin))).text();
  const ms = [];
  const statuses = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    const r = await fetch(new URL(path, origin));
    await r.text();
    ms.push(performance.now() - t0);
    statuses.push(r.status);
  }
  const sorted = [...ms].sort((a, b) => a - b);
  const q = (p) =>
    sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  out[path] = {
    n,
    non200: statuses.filter((s) => s !== 200).length,
    p50: +q(0.5).toFixed(1),
    p90: +q(0.9).toFixed(1),
    min: +sorted[0].toFixed(1),
    max: +sorted.at(-1).toFixed(1),
  };
}
console.log(JSON.stringify(out));
