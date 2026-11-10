/**
 * Disabled-locale URLs: `/en/jobs` on a board that has turned English off.
 *
 * A board serves the locales compiled into its runtime
 * (project.inlang/settings.json). When the operator turns a language off,
 * its prefix stops being a locale and `/en/...` becomes an unknown path.
 * Search engines and old links keep sending visitors there, so the
 * catch-all route permanently redirects those URLs to the same page in the
 * board's language (src/lib/disabled-locale-redirect.ts).
 *
 * Only a language a board can serve counts: a first segment that merely
 * looks like a language tag (a two-letter slug) is left alone.
 */
import { isLocale } from '../paraglide/runtime';

/** Every language a board can turn on. A board serves a subset of these. */
export const BOARD_LANGUAGE_CODES: ReadonlySet<string> = new Set([
  'cs',
  'da',
  'de',
  'en',
  'es',
  'fi',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nb',
  'nl',
  'pl',
  'pt',
  'ru',
  'sv',
  'tr',
  'zh',
]);

/** The board language `pathname` is prefixed with when the board does not
 * serve it, else null. `served` defaults to the compiled locales. */
export function disabledLocaleOf(
  pathname: string,
  served: (tag: string) => boolean = isLocale,
): string | null {
  const first = pathname.split('/')[1];
  if (!first || !BOARD_LANGUAGE_CODES.has(first) || served(first)) {
    return null;
  }
  return first;
}
