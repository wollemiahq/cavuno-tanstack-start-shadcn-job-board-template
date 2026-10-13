/**
 * `virtual:url-words` — the board's localized URL words, filtered to the
 * locales it compiles.
 *
 * `src/url-words.json` holds every shipped language's words
 * (`{ "<locale>": { "<canonical segment>": "<word>" } }`); the platform
 * reads the same file. Shipping all of them would put a dozen word lists
 * in the client shell, so this module keeps only the locales listed in
 * `project.inlang/settings.json` (which include `baseLocale`). Vite (dev
 * and build) and vitest both load it, and it is re-read when any of its
 * files changes.
 *
 * `virtual:url-words-previous` (default export) carries the words each
 * segment used before a rename, from `src/url-words-previous.json`
 * (`{ "<locale>": { "<canonical segment>": ["<retired word>", ...] } }`),
 * filtered the same way, so old links keep redirecting to the current
 * word. It is a separate file because the platform reads
 * `src/url-words.json` strictly. A missing or malformed file reads as no
 * retired words: it must never break the build or the site.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const URL_WORDS_MODULE = 'virtual:url-words';
export const PREVIOUS_URL_WORDS_MODULE = 'virtual:url-words-previous';
const RESOLVED_ID = `\0${URL_WORDS_MODULE}`;
const PREVIOUS_RESOLVED_ID = `\0${PREVIOUS_URL_WORDS_MODULE}`;

const root = resolve(import.meta.dirname, '..');
export const URL_WORDS_PATH = resolve(root, 'src/url-words.json');
export const PREVIOUS_URL_WORDS_PATH = resolve(
  root,
  'src/url-words-previous.json',
);
const SETTINGS_PATH = resolve(root, 'project.inlang/settings.json');

/** The locales the board compiles. */
function compiledLocales() {
  /** @type {{ baseLocale: string; locales?: string[] }} */
  const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  return new Set([settings.baseLocale, ...(settings.locales ?? [])]);
}

/** The word file's entries for the compiled locales only. */
export function compiledUrlWords() {
  const compiled = compiledLocales();
  /** @type {Record<string, Record<string, string>>} */
  const words = JSON.parse(readFileSync(URL_WORDS_PATH, 'utf8'));
  return Object.fromEntries(
    Object.entries(words).filter(([locale]) => compiled.has(locale)),
  );
}

/** @param {unknown} value */
const isRecord = (value) =>
  // The file's I/O boundary: this decodes it.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A retired-word file's entries for `compiled` locales. Anything that is
 * not the documented shape (a missing or unparsable file, a locale or
 * segment that is not an object or list, a non-string word) is dropped.
 *
 * @param {string} path
 * @param {ReadonlySet<string>} compiled
 * @returns {Record<string, Record<string, string[]>>}
 */
export function readPreviousUrlWords(path, compiled) {
  /** @type {unknown} */
  let file;
  try {
    file = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
  if (!isRecord(file)) return {};
  /** @type {Record<string, Record<string, string[]>>} */
  const previous = {};
  for (const [locale, entries] of Object.entries(file)) {
    if (!compiled.has(locale) || !isRecord(entries)) continue;
    /** @type {Record<string, string[]>} */
    const segments = {};
    for (const [canonical, words] of Object.entries(entries)) {
      if (!Array.isArray(words)) continue;
      const retired = words.filter(
        // oxlint-disable-next-line anti-slop/no-runtime-typeof
        (word) => typeof word === 'string',
      );
      if (retired.length > 0) segments[canonical] = retired;
    }
    if (Object.keys(segments).length > 0) previous[locale] = segments;
  }
  return previous;
}

/** The retired-word file's entries for the compiled locales only. */
export function compiledPreviousUrlWords() {
  return readPreviousUrlWords(PREVIOUS_URL_WORDS_PATH, compiledLocales());
}

/** @returns {import('vite').Plugin} */
export function urlWordsPlugin() {
  return {
    name: 'cavuno:url-words',
    resolveId(id) {
      if (id === URL_WORDS_MODULE) return RESOLVED_ID;
      if (id === PREVIOUS_URL_WORDS_MODULE) return PREVIOUS_RESOLVED_ID;
      return undefined;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        this.addWatchFile(URL_WORDS_PATH);
        this.addWatchFile(SETTINGS_PATH);
        return `export default ${JSON.stringify(compiledUrlWords())};\n`;
      }
      if (id === PREVIOUS_RESOLVED_ID) {
        this.addWatchFile(PREVIOUS_URL_WORDS_PATH);
        this.addWatchFile(SETTINGS_PATH);
        return `export default ${JSON.stringify(compiledPreviousUrlWords())};\n`;
      }
      return undefined;
    },
  };
}
