/**
 * Run the unit suite with non-English board languages.
 *
 * A board owner can switch the base locale or rewrite the English copy, so
 * tests must find elements and expected wording through the message
 * functions, not English literals. This compiles each locale below as the
 * base locale in turn and runs vitest, stopping at the first failure:
 * the QA pseudo-locale `en-XA` changes every string (unlike a real catalog
 * that shares words with English), and `fr` adds real number and date
 * formatting, the non-English code paths, and no-break spaces. It always
 * restores settings.json, branding.json and the Paraglide output.
 *
 *   pnpm run test:locale [vitest args]
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES = ['en-XA', 'fr'];
const settingsPath = resolve(process.cwd(), 'project.inlang/settings.json');
const brandingPath = resolve(process.cwd(), 'src/branding.json');
const originals = new Map(
  [settingsPath, brandingPath].map((path) => [
    path,
    readFileSync(path, 'utf8'),
  ]),
);

function run(command, args) {
  return spawnSync(command, args, { stdio: 'inherit' }).status ?? 1;
}

function writeJson(path, update) {
  const value = JSON.parse(originals.get(path));
  update(value);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

// Ctrl-C, a timeout or a closed terminal reaches vitest too; outlive it so
// the finally block restores files.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])
  process.on(signal, () => {});

let status = 1;
try {
  // The pseudo catalogs are ignored outputs derived from messages/en.json.
  status = run(process.execPath, ['scripts/gen-paraglide-messages.mjs']);
  for (const locale of LOCALES) {
    if (status !== 0) break;
    console.log(`\ntest:locale: ${locale}`);
    writeJson(settingsPath, (settings) => {
      settings.baseLocale = locale;
      settings.locales = [...new Set([...settings.locales, locale])];
    });
    writeJson(brandingPath, (branding) => {
      branding.language = locale;
    });
    status =
      run('pnpm', ['run', 'gen:paraglide']) ||
      run('pnpm', ['run', 'gen:theme']) ||
      run('pnpm', ['exec', 'vitest', 'run', ...process.argv.slice(2)]);
  }
} finally {
  for (const [path, text] of originals) writeFileSync(path, text);
  const restored = run('pnpm', ['run', 'gen:paraglide']);
  if (status === 0) status = restored;
}
process.exit(status);
