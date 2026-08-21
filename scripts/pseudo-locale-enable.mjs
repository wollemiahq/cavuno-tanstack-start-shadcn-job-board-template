/**
 * Enable QA pseudo-locales in project.inlang/settings.json for a one-off
 * Paraglide compile + build. Production compiles whatever settings.json
 * lists (default: ["en"]) so en-XA / ar-XB never ship to clients; CI
 * appends the pseudo-locales onto the current public list, rebuilds, runs
 * scripts/pseudo-locale-gate.mjs, then restores settings via git checkout.
 *
 *   node scripts/pseudo-locale-enable.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PSEUDO = ['en-XA', 'ar-XB'];
const settingsPath = resolve(process.cwd(), 'project.inlang/settings.json');
const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

const production = (
  Array.isArray(settings.locales) ? settings.locales : []
).filter((locale) => typeof locale === 'string' && !PSEUDO.includes(locale));
if (!production.includes(settings.baseLocale ?? 'en')) {
  production.unshift(settings.baseLocale ?? 'en');
}
settings.locales = [...production, ...PSEUDO];

writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
console.log(
  `pseudo-locale-enable: locales → ${JSON.stringify(settings.locales)}`,
);
