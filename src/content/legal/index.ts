import { getLocale } from '../../paraglide/runtime';
import about from './about.json';
import cookiePolicy from './cookie-policy.json';
import impressum from './impressum.json';
import privacyPolicy from './privacy-policy.json';
import termsOfService from './terms-of-service.json';
import { legalEntity } from './types';

import type {
  LegalPageContent,
  LegalPageData,
  LegalPageType,
  LegalTranslations,
} from './types';

export { legalEntity } from './types';
export type {
  LegalEntityConfig,
  LegalLocale,
  LegalPageContent,
  LegalPageData,
  LegalPageType,
  LegalTranslations,
} from './types';

/**
 * Application-owned legal/about content: one JSON module per page
 * (`src/content/legal/<page>.json`). Each holds the page in its source
 * language plus the starter's built-in translations. Edit the JSON in place;
 * there is no code to change.
 *
 * The impressum ships empty. It is a legal notice only the operator can
 * write, so the page and its footer link stay off until it has content.
 */
export const LEGAL_PAGES_CONTENT = {
  about,
  'privacy-policy': privacyPolicy,
  'terms-of-service': termsOfService,
  'cookie-policy': cookiePolicy,
  impressum,
} satisfies Record<LegalPageType, LegalPageData>;

/**
 * Translations into extra locales, one JSON file per locale
 * (`src/content/legal/translations/<locale>.json`). They are found by file
 * name, so adding a locale needs no registration here.
 */
const TRANSLATIONS = import.meta.glob<LegalTranslations>(
  './translations/*.json',
  { eager: true, import: 'default' },
);

/**
 * Resolve a page for a locale: an extra-locale translation, else the page's
 * own entry for that locale, else its source-language entry. `null` means
 * the page has no content and must not be published.
 */
export function resolveLegalContent(
  type: LegalPageType,
  locale: string = getLocale(),
): LegalPageContent | null {
  const translated = TRANSLATIONS[`./translations/${locale}.json`]?.[type];
  if (translated) return translated;
  const page: LegalPageData = LEGAL_PAGES_CONTENT[type];
  return page.locales[locale] ?? page.locales[page.sourceLanguage] ?? null;
}

/**
 * Resolve impressum legal-entity facts for the view.
 *
 * The legal NAME comes from the board over the wire: hosted stores it as
 * `companyLegalName` and `board.context().contact.legalName` serves it (SDK
 * 4.13.0), so a migrated board keeps the name its operator already set without
 * anyone editing this file. The static `legalEntity` below stays the fallback
 * for a hand-run board, and is the only source for the ADDRESS, which the
 * board context does not carry.
 *
 * Returns `null` when both fields are empty so the facts card is omitted.
 */
export function resolveLegalEntity(contactLegalName?: string | null) {
  const legalName =
    contactLegalName?.trim() || legalEntity?.legalName?.trim() || null;
  const address = legalEntity?.address?.trim() || null;
  if (!legalName && !address) return null;
  return { legalName, address };
}
