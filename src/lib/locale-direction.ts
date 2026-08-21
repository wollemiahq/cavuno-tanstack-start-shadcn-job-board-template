/**
 * Locale → writing direction for the document element.
 *
 * `<html dir>` is the single switch every RTL affordance hangs off:
 * CSS logical properties (`ms-*`, `pe-*`, `text-start`, `border-s`)
 * resolve against it, Tailwind's `rtl:`/`ltr:` variants match
 * `[dir="rtl"]` ancestors, and Base UI popups read it for placement. It
 * must therefore be declared server-side on the first byte — deriving it
 * client-side would mirror the page after paint.
 *
 * Shipped chrome locales are LTR today (English by default; de/fr when
 * enabled). `ar-XB` is the pseudo-bidi CI locale
 * (scripts/pseudo-locale.mjs) that exists purely so the mirrored layout
 * is provable in CI without shipping a real Arabic catalog. Adding a
 * real RTL chrome locale is a one-line change here.
 */

/** Locale roots that are written right-to-left (CLDR script direction). */
const RTL_LANGUAGES = new Set([
  'ar',
  'arc',
  'ckb',
  'dv',
  'fa',
  'he',
  'ks',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
]);

export type Direction = 'ltr' | 'rtl';

/**
 * Direction for a BCP-47 tag. Matches on the language subtag, so
 * `ar-XB`, `ar`, and `ar-EG` all resolve to `rtl` while `en`, `de`,
 * `fr`, and the `en-XA` pseudo-accent locale stay `ltr`.
 */
export function localeDirection(locale: string | undefined): Direction {
  const language = (locale ?? '').split('-')[0]?.toLowerCase() ?? '';
  return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
}
