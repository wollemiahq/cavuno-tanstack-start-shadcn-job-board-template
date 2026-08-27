import { pseudoBidi, pseudoLocalize } from './pseudo-locale.mjs';

/**
 * Paraglide messages maintenance.
 *
 * Chrome copy lives in `messages/{locale}.json` (application-owned).
 * Production compiles whatever `project.inlang/settings.json` lists
 * (default: English only). Extra catalogs (de/fr) stay on disk dormant
 * so `pnpm locale:add` can enable them without starting from a blank file.
 * This script does NOT pull from `@cavuno/board` — the SDK no longer ships
 * a `uiCopy` catalog. It regenerates the pseudo-locales (`en-XA`, `ar-XB`)
 * from the current English source so coverage gates stay honest.
 *
 *   node scripts/gen-paraglide-messages.mjs
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';

const PSEUDO_LOCALES = new Set(['en-XA', 'ar-XB']);

const SOURCE_LOCALES = readdirSync('messages')
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length))
  .filter((locale) => !PSEUDO_LOCALES.has(locale))
  .sort();
if (!SOURCE_LOCALES.includes('en')) {
  throw new Error('messages/en.json is required');
}

function readMessages(locale) {
  return JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));
}

function writeMessages(locale, messages) {
  mkdirSync('messages', { recursive: true });
  const path = `messages/${locale}.json`;
  const next = JSON.stringify(messages, null, 2) + '\n';
  const count = Object.keys(messages).filter((k) => !k.startsWith('$')).length;
  // Byte-identical → do not touch the file. Every write here bumps an
  // mtime the paraglide Vite plugin watches; writing all five catalogs
  // in ~100ms fires five overlapping recompiles and five back-to-back
  // `[vite] program reload`s, which tear down the Cloudflare runner
  // worker mid-entry-load and leave the dev server 500ing until it is
  // restarted (builder prod 2026-08-27; reproduced 3/3 locally, never
  // recovered in 150s). Skipping unchanged files turns that into one
  // recompile for the file that actually changed.
  if (existsSync(path) && readFileSync(path, 'utf8') === next) {
    console.log(`${path} — ${count} keys (unchanged)`);
    return;
  }
  writeFileSync(path, next);
  console.log(`${path} — ${count} keys`);
}

// Validate source locales parse and share a schema key.
let enMessages;
for (const locale of SOURCE_LOCALES) {
  const messages = readMessages(locale);
  if (!messages.$schema) {
    throw new Error(`messages/${locale}.json missing $schema`);
  }
  // Round-trip write keeps key order stable after hand-edits.
  writeMessages(locale, messages);
  if (locale === 'en') enMessages = messages;
}

// Pseudo-locales — derived from the CURRENT en source so the coverage
// gates survive catalog additions for free.
//   en-XA — pseudo-accent: proves every string came through Paraglide.
//   ar-XB — pseudo-bidi: same, plus it is the RTL locale the layout is
//           verified against (dir="rtl", mirrored chrome).
for (const [locale, derive] of [
  ['en-XA', pseudoLocalize],
  ['ar-XB', pseudoBidi],
]) {
  const pseudo = { $schema: enMessages.$schema };
  for (const [key, value] of Object.entries(enMessages)) {
    if (key.startsWith('$')) continue;
    pseudo[key] = derive(value);
  }
  writeMessages(locale, pseudo);
}
