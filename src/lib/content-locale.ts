import { baseLocale, getLocale } from '../paraglide/runtime';

/**
 * Read options that ask the Board API for a page's board-authored copy in
 * the visitor's language: `?locale=` on pages served under a locale prefix,
 * nothing on board-language pages. The board language sends no parameter at
 * all, so those reads keep the URL, and so the cache entry, they always had.
 * The read cache keys on the URL, which is why the locale travels as a query
 * parameter and never as a header.
 */
export function contentLocaleQuery(locale: string = getLocale()): {
  query?: { locale: string };
} {
  return locale === baseLocale ? {} : { query: { locale } };
}
