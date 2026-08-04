import { pseudoBidi, pseudoLocalize } from './pseudo-locale.mjs';

/**
 * Paraglide messages maintenance.
 *
 * Chrome copy lives in `messages/{en,de,fr}.json` (application-owned).
 * This script does NOT pull from `@cavuno/board` — the SDK no longer ships
 * a `uiCopy` catalog. It regenerates the pseudo-locales (`en-XA`, `ar-XB`)
 * from the current English source so coverage gates stay honest.
 *
 *   node scripts/gen-paraglide-messages.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const SOURCE_LOCALES = ['en', 'de', 'fr'];

function readMessages(locale) {
  return JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));
}

function writeMessages(locale, messages) {
  mkdirSync('messages', { recursive: true });
  writeFileSync(
    `messages/${locale}.json`,
    JSON.stringify(messages, null, 2) + '\n',
  );
  const count = Object.keys(messages).filter((k) => !k.startsWith('$')).length;
  console.log(`messages/${locale}.json — ${count} keys`);
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
