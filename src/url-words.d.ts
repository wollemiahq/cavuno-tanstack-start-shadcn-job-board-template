/** The board's URL words, filtered at build time to its compiled locales
 * (scripts/url-words-plugin.mjs). */
declare module 'virtual:url-words' {
  const words: Readonly<Record<string, Readonly<Record<string, string>>>>;
  export default words;
}
