/**
 * The human-facing chrome locales. `en-XA` (pseudo-accent) and `ar-XB`
 * (pseudo-bidi) are QA-only compile-ins (scripts/pseudo-locale-enable.mjs)
 * and must never be advertised on SEO surfaces (hreflang alternates,
 * sitemap) or offered in the language switcher — even in a QA build.
 * Filter the Paraglide `locales` array through this list wherever the
 * output is crawlable or human-facing.
 */
export const PUBLIC_LOCALES = ['en', 'de', 'fr'] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export function publicLocales(locales: readonly string[]): PublicLocale[] {
  return locales.filter((locale): locale is PublicLocale =>
    (PUBLIC_LOCALES as readonly string[]).includes(locale),
  );
}
