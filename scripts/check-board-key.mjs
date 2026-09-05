/**
 * Deploy gate: refuse to ship the shared reference board key.
 *
 * `wrangler.jsonc` commits a WORKING publishable key so `git clone && pnpm dev`
 * shows real jobs on the first run. That convenience is also a footgun: nothing
 * in the template fails when you keep it. `src/lib/env.ts` only throws when
 * CAVUNO_BOARD is ABSENT, and it never is — so a fork that runs `wrangler
 * deploy` without swapping the key serves the reference board's jobs,
 * companies, SEO and robots.txt under its own domain. That is not theoretical:
 * a production board served another tenant's content on 2026-09-04.
 *
 * So the default stays (dev keeps working) and the DEPLOY is what fails.
 * Wired as `predeploy`, which pnpm runs before `pnpm run deploy`.
 *
 * Deploying the reference board on purpose — the template's own preview:
 *   CAVUNO_ALLOW_REFERENCE_BOARD=1 pnpm run deploy
 *
 * The platform's own builder deploys do not pass through here: they invoke
 * wrangler directly against a patched config whose CAVUNO_BOARD is already
 * the tenant's own key.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** The key committed in wrangler.jsonc. `board-key-gate.test.ts` pins these together. */
export const REFERENCE_BOARD_KEY = 'pk_d9ce40a106227b615ec710de3f3d73dc';

export function usesReferenceBoardKey(wranglerSource) {
  return wranglerSource.includes(REFERENCE_BOARD_KEY);
}

function main() {
  if (process.env.CAVUNO_ALLOW_REFERENCE_BOARD === '1') {
    console.log(
      'check-board-key: CAVUNO_ALLOW_REFERENCE_BOARD=1 — deploying the shared reference board on purpose.',
    );
    return;
  }

  if (!usesReferenceBoardKey(readFileSync('wrangler.jsonc', 'utf8'))) {
    console.log('check-board-key: CAVUNO_BOARD is your own board key.');
    return;
  }

  console.error(
    [
      '',
      'Refusing to deploy: wrangler.jsonc still has the shared reference board key.',
      '',
      `  CAVUNO_BOARD = ${REFERENCE_BOARD_KEY}`,
      '',
      "Deploying this serves the reference board's jobs, companies, SEO and",
      'robots.txt from your domain. Swap it for your own board:',
      '',
      '  1. Cavuno dashboard → your board → API keys → copy the pk_… key',
      '  2. wrangler.jsonc → vars.CAVUNO_BOARD → paste it',
      '',
      'Deploying the reference board on purpose:',
      '  CAVUNO_ALLOW_REFERENCE_BOARD=1 pnpm run deploy',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

// Run only as a CLI, not when the test imports the predicate. Compare real
// file URLs: `import.meta.url` is symlink-resolved and percent-encoded, so a
// string-built `file://${argv[1]}` silently never matches on a symlinked
// checkout (`/tmp` on macOS), a path with a space, or Windows.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (invokedDirectly) main();
