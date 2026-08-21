/**
 * Human-facing chrome locales vs CI pseudo-locales.
 *
 * Production compiles whatever `project.inlang/settings.json` lists.
 * Default is English only. Extra catalogs (`messages/de.json`,
 * `messages/fr.json`, …) stay in the repo dormant — `pnpm locale:add de`
 * adds the locale to settings, and the switcher / hreflang tags appear
 * once more than one public locale is compiled.
 *
 * `en-XA` (pseudo-accent) and `ar-XB` (pseudo-bidi/RTL) exist only for
 * the CI coverage gate and must never ship as public chrome locales.
 */

export const PSEUDO_LOCALES = ['en-XA', 'ar-XB'] as const;

const PSEUDO_LOCALE_SET = new Set<string>(PSEUDO_LOCALES);

export function isPseudoLocale(locale: string): boolean {
  return PSEUDO_LOCALE_SET.has(locale);
}

/** Compiled locales minus the CI pseudo-locales. */
export function publicLocales(all: readonly string[]): string[] {
  return all.filter((locale) => !isPseudoLocale(locale));
}
