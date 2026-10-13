/** The board's URL words, filtered at build time to its compiled locales
 * (scripts/url-words-plugin.mjs). */
declare module 'virtual:url-words' {
  const words: Readonly<Record<string, Readonly<Record<string, string>>>>;
  export default words;
}

/** Each segment's retired words from src/url-words-previous.json, filtered
 * the same way. */
declare module 'virtual:url-words-previous' {
  const previous: Readonly<
    Record<string, Readonly<Record<string, readonly string[]>>>
  >;
  export default previous;
}
