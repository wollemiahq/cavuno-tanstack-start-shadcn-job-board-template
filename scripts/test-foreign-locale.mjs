/**
 * Run the unit suite with a non-English board language.
 *
 * A board owner can switch the base locale or rewrite the English copy, so
 * tests must find elements and expected wording through the message
 * functions, not English literals. This compiles the QA pseudo-locale
 * `en-XA` as the base locale (every string changes, unlike a real catalog
 * that shares words with English), runs vitest, and always restores
 * settings.json, branding.json and the Paraglide output.
 *
 *   pnpm run test:locale [vitest args]
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALE = 'en-XA';
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

// Ctrl-C reaches vitest too; outlive it so the finally block restores files.
process.on('SIGINT', () => {});

let status = 1;
try {
  // The pseudo catalogs are ignored outputs derived from messages/en.json.
  status = run(process.execPath, ['scripts/gen-paraglide-messages.mjs']);
  if (status === 0) {
    writeJson(settingsPath, (settings) => {
      settings.baseLocale = LOCALE;
      settings.locales = [...new Set([...settings.locales, LOCALE])];
    });
    writeJson(brandingPath, (branding) => {
      branding.language = LOCALE;
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
