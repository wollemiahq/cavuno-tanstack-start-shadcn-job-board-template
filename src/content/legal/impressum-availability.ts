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
 * Whether the impressum is published: the operator has written one in any
 * language. The starter never ships impressum text, because its facts
 * (registered address, register entry, VAT ID) can only come from the
 * operator, so writing it is what publishes it. The page, footer link,
 * sitemap and well-known manifest all use this rule; none of them reads the
 * board context's `features.impressum`.
 *
 * Asks the same resolver the page uses, which serves a page in every locale
 * once it has content in one, so this needs no locale. Call it on the server
 * only (the root loader passes the footer a boolean): it reads every
 * translation file.
 */
export function impressumHasContent(): boolean {
  return resolvePageContent(page, translations, page.sourceLanguage) !== null;
}
