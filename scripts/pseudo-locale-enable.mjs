/**
 * Enable QA pseudo-locales in project.inlang/settings.json for a one-off
 * Paraglide compile + build. Production defaults to ["en","de","fr"] so
 * en-XA / ar-XB never ship to clients; CI rewrites locales, rebuilds, runs
 * scripts/pseudo-locale-gate.mjs, then restores settings via git checkout.
 *
 *   node scripts/pseudo-locale-enable.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const settingsPath = resolve(process.cwd(), 'project.inlang/settings.json');
const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

settings.locales = ['en', 'de', 'fr', 'en-XA', 'ar-XB'];

writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
console.log(
  `pseudo-locale-enable: locales → ${JSON.stringify(settings.locales)}`,
);
