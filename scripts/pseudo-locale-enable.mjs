/**
 * Enable QA pseudo-locales in project.inlang/settings.json for a one-off
 * Paraglide compile + build. Production compiles whatever settings.json
 * lists (default: ["en"]) so en-XA / ar-XB never ship to clients; CI
 * appends the pseudo-locales onto the current public list, rebuilds, runs
 * scripts/pseudo-locale-gate.mjs, then restores settings via git checkout.
 *
 *   node scripts/pseudo-locale-enable.mjs
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PSEUDO = ['en-XA', 'ar-XB'];
const settingsPath = resolve(process.cwd(), 'project.inlang/settings.json');
const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

const production = (
  Array.isArray(settings.locales) ? settings.locales : []
).filter(
  (locale) =>
    Object.prototype.toString.call(locale) === '[object String]' &&
    !PSEUDO.includes(locale),
);
if (!production.includes(settings.baseLocale ?? 'en')) {
  production.unshift(settings.baseLocale ?? 'en');
}
settings.locales = [...production, ...PSEUDO];

// The pseudo catalogs are ignored QA outputs, so enabling the locales also
// prepares the files that the Paraglide build and runtime gate consume.
const generated = spawnSync(
  process.execPath,
  [resolve(process.cwd(), 'scripts/gen-paraglide-messages.mjs')],
  { stdio: 'inherit' },
);
if (generated.status !== 0) {
  process.exit(generated.status ?? 1);
}

writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
console.log(
  `pseudo-locale-enable: locales → ${JSON.stringify(settings.locales)}`,
);
