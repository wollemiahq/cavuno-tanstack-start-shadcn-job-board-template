/**
 * Enable a chrome locale on this board.
 *
 * Copies `messages/en.json` to `messages/<locale>.json` when that catalog
 * is missing (de/fr already ship dormant), then adds the locale to
 * `project.inlang/settings.json`. After compile, the footer switcher and
 * hreflang tags appear — they stay hidden while only one public locale
 * is compiled.
 *
 *   pnpm locale:add de
 *   pnpm locale:add fr
 *
 * Then: `pnpm gen:messages && pnpm gen:paraglide`
 *
 * Never pass en-XA / ar-XB — those are CI-only (see
 * scripts/pseudo-locale-enable.mjs).
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PSEUDO = new Set(['en-XA', 'ar-XB']);
const locale = process.argv[2]?.trim();

if (!locale || !/^[a-z]{2}(?:-[A-Za-z]{2,8})?$/.test(locale)) {
  console.error('usage: pnpm locale:add <locale>   e.g. pnpm locale:add de');
  process.exit(2);
}

if (PSEUDO.has(locale)) {
  console.error(
    `${locale} is a CI pseudo-locale — not a public chrome language.`,
  );
  process.exit(2);
}

const root = process.cwd();
const settingsPath = resolve(root, 'project.inlang/settings.json');
const catalogPath = resolve(root, 'messages', `${locale}.json`);
const enPath = resolve(root, 'messages/en.json');

const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
if (!Array.isArray(settings.locales)) {
  settings.locales = [settings.baseLocale ?? 'en'];
}

if (settings.locales.includes(locale)) {
  console.log(
    `locale:add: ${locale} is already in project.inlang/settings.json`,
  );
} else {
  settings.locales = [...new Set([...settings.locales, locale])].sort((a, b) =>
    a.localeCompare(b),
  );
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  console.log(`locale:add: locales → ${JSON.stringify(settings.locales)}`);
}

if (!existsSync(catalogPath)) {
  if (!existsSync(enPath)) {
    console.error('messages/en.json is missing — cannot seed a catalog');
    process.exit(1);
  }
  copyFileSync(enPath, catalogPath);
  console.log(
    `locale:add: copied messages/en.json → messages/${locale}.json (translate it)`,
  );
} else {
  console.log(`locale:add: messages/${locale}.json already exists`);
}

console.log('next: pnpm gen:messages && pnpm gen:paraglide');
