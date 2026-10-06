import type { LegalPageContent, LegalPageData } from './types';

/** A page's entries from `translations/<locale>.json`, keyed by locale. */
export type PageTranslations = Partial<Record<string, LegalPageContent>>;

/** `./translations/de.json` → `de`. */
export function translationLocale(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.json$/, '');
}

/**
 * Resolve one page for a locale: its extra-locale translation, else its own
 * entry for that locale, else its source-language entry, else any entry it
 * has. `null` only when the page has no content in any language.
 *
 * Legal URLs are the same for every locale, so a page that has content
 * anywhere is served everywhere; the impressum gate, sitemap and footer can
 * then decide once for all locales.
 */
export function resolvePageContent(
  page: LegalPageData,
  translations: PageTranslations,
  locale: string,
): LegalPageContent | null {
  return (
    translations[locale] ??
    page.locales[locale] ??
    page.locales[page.sourceLanguage] ??
    Object.values(page.locales).find((entry) => entry !== undefined) ??
    Object.values(translations).find((entry) => entry !== undefined) ??
    null
  );
}
