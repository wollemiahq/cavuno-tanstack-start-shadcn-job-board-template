/**
 * Where a disabled locale's URL goes: the same page in the board's language.
 * `/en/companies/acme/jobs/designer` on a Dutch board becomes
 * `/bedrijven/acme/vacatures/designer`.
 *
 * The locale prefix is dropped, the path's static words are read in the
 * disabled locale's words and written in the board language's (the same
 * template matching as src/lib/localized-path.ts), and slugs are kept. A
 * path that matches no page is only stripped of its prefix; the page it
 * lands on applies its own canonical and not-found handling.
 *
 * Server only: it reads every language's words from src/url-words.json,
 * not just the compiled ones, because the disabled locale is by definition
 * no longer compiled. English needs no list; its words are the canonical
 * ones.
 *
 * Never loops: the target carries no disabled-locale prefix unless the
 * request stacked several, and each hop removes one.
 */
import URL_WORDS from '../url-words.json';
import { disabledLocaleOf } from './disabled-locale';
import { delocalizeSegments, localizeSegments } from './localized-path';

import type { LocaleRouting } from './localized-path';
import type { UrlWords } from './url-words';

const ALL_URL_WORDS: UrlWords = URL_WORDS;

/** The board-language path for a disabled locale's `pathname`, or null when
 * `pathname` is not one. `routing` is the board's (the compiled runtime by
 * default); tests pass another board's. */
export function disabledLocaleRedirectPath(
  pathname: string,
  routing?: LocaleRouting,
  words: UrlWords = ALL_URL_WORDS,
): string | null {
  const locale = disabledLocaleOf(pathname, routing?.isLocale);
  if (!locale) return null;
  const rest = pathname.slice(locale.length + 1) || '/';
  // Read the rest as an unprefixed URL of a board whose language is the
  // disabled locale, back to canonical words.
  const canonical = delocalizeSegments(rest, {
    baseLocale: locale,
    isLocale: () => false,
    words,
  });
  const target = localizeSegments(canonical, routing);
  // "//host" or "/\host" would leave the site in a Location header.
  if (target.startsWith('//') || target.startsWith('/\\')) return null;
  return target;
}
