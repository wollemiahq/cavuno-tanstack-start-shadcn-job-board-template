/**
 * `cloudflare:workers` only resolves inside the Workers runtime. Tests run on
 * node/jsdom, so any suite whose import graph reaches `src/lib/env.ts` fails to
 * COLLECT — the file is skipped entirely and its assertions silently stop
 * protecting anything, which is worse than a red test.
 *
 * Several suites get by with a per-file `vi.mock('cloudflare:workers')`, but
 * that is not enough for every graph: with the mock in place and this alias
 * removed, `-talent-route-contract.test.tsx` still dies with "Failed to resolve
 * import 'cloudflare:workers' from src/lib/env.ts" at vite:import-analysis,
 * which runs before mocking applies. Aliased so it holds for every suite.
 *
 * The per-file mocks elsewhere are now redundant but left alone — deleting a
 * dozen of them is a separate change, not a CI fix.
 *
 * The bindings are deliberately empty — a test that needs real env values
 * should stub `getServerEnv` itself rather than lean on this.
 */
export const env = {};
