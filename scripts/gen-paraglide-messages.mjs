import { pseudoBidi, pseudoCatalog, pseudoLocalize } from './pseudo-locale.mjs';

/**
 * Paraglide messages maintenance.
 *
 * Chrome copy lives in `messages/{locale}.json` (application-owned). Real
 * catalogs are validated here but never rewritten: their translations and
 * intentional formatting stay under the owner's control. Production compiles
 * whatever `project.inlang/settings.json` lists (default: English only).
 *
 * The QA pseudo-locales (`en-XA`, `ar-XB`) are derived from English into the
 * ignored `messages/` outputs on demand. CI enables them temporarily for its
 * runtime gate; they are never human-authored or shipped by default.
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

function writePseudoMessages(locale, messages) {
  mkdirSync('messages', { recursive: true });
  const path = `messages/${locale}.json`;
  const next = JSON.stringify(messages, null, 2) + '\n';
  const count = Object.keys(messages).filter(
    (key) => !key.startsWith('$'),
  ).length;
  // Keep unchanged QA output untouched as well. This prevents the Paraglide
  // Vite plugin from treating every test or CI preparation as a catalog edit.
  if (existsSync(path) && readFileSync(path, 'utf8') === next) {
    console.log(`${path} — ${count} keys (unchanged)`);
    return;
  }
  writeFileSync(path, next);
  console.log(`${path} — ${count} QA keys`);
}

// Validate source locales without round-tripping them through JSON.stringify.
// In particular, do not fill or normalize a real translation catalog from
// English: parity remains an explicit test contract.
const sourceCatalogs = new Map();
for (const locale of SOURCE_LOCALES) {
  const messages = readMessages(locale);
  if (!messages.$schema) {
    throw new Error(`messages/${locale}.json missing $schema`);
  }
  sourceCatalogs.set(locale, messages);
}

const enMessages = sourceCatalogs.get('en');

// Pseudo-locales are derived from the CURRENT en source so the coverage gates
// survive catalog additions for free. The files are ignored QA artifacts:
//   en-XA — pseudo-accent, proves every string came through Paraglide.
//   ar-XB — pseudo-bidi, plus the RTL locale used by the layout gate.
for (const [locale, derive] of [
  ['en-XA', pseudoLocalize],
  ['ar-XB', pseudoBidi],
]) {
  writePseudoMessages(locale, pseudoCatalog(enMessages, derive));
}
