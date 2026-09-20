import { validateCatalog } from './catalog-contract.mjs';

/**
 * Enable a chrome locale on this board.
 *
 * Copies `messages/en.json` to `messages/<locale>.json` when that catalog
 * is missing (de/fr already ship dormant). A seeded catalog stays disabled
 * until it has been translated; an existing complete catalog is added to
 * `project.inlang/settings.json`.
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

if (!existsSync(catalogPath)) {
  if (settings.locales.includes(locale)) {
    console.error(
      `locale:add: ${locale} is enabled but messages/${locale}.json is missing`,
    );
    process.exit(1);
  }
  if (!existsSync(enPath)) {
    console.error('messages/en.json is missing — cannot seed a catalog');
    process.exit(1);
  }
  copyFileSync(enPath, catalogPath);
  console.log(
    `locale:add: copied messages/en.json → messages/${locale}.json (translate it; locale remains disabled)`,
  );
  console.log('next: translate the catalog, then rerun pnpm locale:add');
  process.exit(0);
}

if (!existsSync(enPath)) {
  console.error('messages/en.json is missing — cannot validate a catalog');
  process.exit(1);
}

const errors = validateCatalog(
  JSON.parse(readFileSync(enPath, 'utf8')),
  JSON.parse(readFileSync(catalogPath, 'utf8')),
  locale,
);
if (errors.length > 0) {
  console.error(`locale:add: refusing to enable incomplete ${locale} catalog`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
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

console.log('next: pnpm gen:messages && pnpm gen:paraglide');
