/**
 * `cloudflare:workers` only resolves inside the Workers runtime. Tests run on
 * node/jsdom, so any suite whose import graph reaches `src/lib/env.ts` fails to
 * COLLECT — the file is skipped entirely and its assertions silently stop
 * protecting anything, which is worse than a red test.
 *
 * A per-file `vi.mock` does not cover it: the route modules pull env in through
 * a graph vite resolves during import-analysis, before mocking applies. Aliased
 * here so it holds for every suite.
 *
 * The bindings are deliberately empty — a test that needs real env values
 * should stub `getServerEnv` itself rather than lean on this.
 */
export const env = {};
