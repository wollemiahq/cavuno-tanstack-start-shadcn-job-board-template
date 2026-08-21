/**
 * `cloudflare:workers` only resolves inside the Workers runtime. Tests run on
 * node/jsdom, so any suite whose import graph reaches `src/lib/env.ts` fails to
 * COLLECT — the file is skipped entirely and its assertions silently stop
 * protecting anything, which is worse than a red test.
 *
 * Nine suites get by with a per-file `vi.mock('cloudflare:workers')`, so that
 * usually works. It does NOT work for `-talent-route-contract.test.tsx`: with
 * the alias removed and that mock added, the file still dies with "Failed to
 * resolve import 'cloudflare:workers' from src/lib/env.ts" (vite:import-
 * analysis). Reverting the alias alone fails exactly that one suite — 1250
 * tests vs 1262. Why that graph differs from the nine is not established;
 * what is established is that the mock is not sufficient for it, so the alias
 * covers every suite rather than leaving one that cannot be fixed in-file.
 *
 * The per-file mocks elsewhere are now redundant but left alone — deleting a
 * dozen of them is a separate change, not a CI fix.
 *
 * The bindings are deliberately empty — a test that needs real env values
 * should stub `getServerEnv` itself rather than lean on this.
 */
export const env = {};
