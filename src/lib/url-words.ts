/**
 * The board's localized URL words: src/url-words.json filtered at build
 * time to the locales in project.inlang/settings.json
 * (scripts/url-words-plugin.mjs), so word lists for languages the board
 * does not serve stay out of the client bundle.
 */
import compiledUrlWords from 'virtual:url-words';

/** Per-locale words for static route segments, keyed by canonical
 * segment: `{ "<locale>": { "<canonical segment>": "<word>" } }`. */
export type UrlWords = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

export const BOARD_URL_WORDS: UrlWords = compiledUrlWords;
