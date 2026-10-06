import impressum from './impressum.json';
import { resolvePageContent, translationLocale } from './resolve';

import type { PageTranslations } from './resolve';
import type { LegalPageData, LegalTranslations } from './types';

const page: LegalPageData = impressum;

// The whole file, not `import: 'impressum'`: a named import fails the build
// for a translation file without an impressum.
const TRANSLATIONS = import.meta.glob<LegalTranslations>(
  './translations/*.json',
  { eager: true, import: 'default' },
);

const translations: PageTranslations = Object.fromEntries(
  Object.entries(TRANSLATIONS).map(([path, file]) => [
    translationLocale(path),
    file.impressum,
  ]),
);

/**
 * Whether the operator has written an impressum in any language. Asks the
 * same resolver the page uses, which serves a page in every locale once it
 * has content in one, so this needs no locale.
 */
export function impressumHasContent(): boolean {
  return resolvePageContent(page, translations, page.sourceLanguage) !== null;
}

/**
 * The impressum is published only when the board enables it AND the operator
 * has written one. The starter never ships impressum text, because its facts
 * (registered address, register entry, VAT ID) can only come from the
 * operator. The page, footer link, sitemap and well-known manifest all use
 * this rule.
 *
 * Kept apart from `./index` so the footer does not bundle every legal page
 * (only extra-locale translation files, which the starter does not ship).
 */
export function impressumAvailable(features: { impressum: boolean }): boolean {
  return features.impressum && impressumHasContent();
}
