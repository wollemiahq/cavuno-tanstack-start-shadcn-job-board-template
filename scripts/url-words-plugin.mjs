/**
 * `virtual:url-words` — the board's localized URL words, filtered to the
 * locales it compiles.
 *
 * `src/url-words.json` holds every shipped language's words
 * (`{ "<locale>": { "<canonical segment>": "<word>" } }`); the platform
 * reads the same file. Shipping all of them would put a dozen word lists
 * in the client shell, so this module keeps only the locales listed in
 * `project.inlang/settings.json` (which include `baseLocale`). Vite (dev
 * and build) and vitest both load it, and it is re-read when either file
 * changes.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const URL_WORDS_MODULE = 'virtual:url-words';
const RESOLVED_ID = `\0${URL_WORDS_MODULE}`;

const root = resolve(import.meta.dirname, '..');
export const URL_WORDS_PATH = resolve(root, 'src/url-words.json');
const SETTINGS_PATH = resolve(root, 'project.inlang/settings.json');

/** The word file's entries for the compiled locales only. */
export function compiledUrlWords() {
  /** @type {{ baseLocale: string; locales?: string[] }} */
  const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  const compiled = new Set([settings.baseLocale, ...(settings.locales ?? [])]);
  /** @type {Record<string, Record<string, string>>} */
  const words = JSON.parse(readFileSync(URL_WORDS_PATH, 'utf8'));
  return Object.fromEntries(
    Object.entries(words).filter(([locale]) => compiled.has(locale)),
  );
}

/** @returns {import('vite').Plugin} */
export function urlWordsPlugin() {
  return {
    name: 'cavuno:url-words',
    resolveId(id) {
      return id === URL_WORDS_MODULE ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      this.addWatchFile(URL_WORDS_PATH);
      this.addWatchFile(SETTINGS_PATH);
      return `export default ${JSON.stringify(compiledUrlWords())};\n`;
    },
  };
}
