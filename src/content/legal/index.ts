import { getLocale } from '../../paraglide/runtime';
import { aboutContent } from './about';
import { cookiePolicyContent } from './cookie-policy';
import { impressumContent } from './impressum';
import { privacyPolicyContent } from './privacy-policy';
import { termsOfServiceContent } from './terms-of-service';
import { legalEntity } from './types';

import type { LegalLocale, LegalPageContent, LegalPageType } from './types';

export { legalEntity } from './types';
export type {
  LegalEntityConfig,
  LegalLocale,
  LegalPageContent,
  LegalPageType,
} from './types';

/**
 * Application-owned legal/about content, keyed by chrome locale then
 * `LegalPageType` (also the URL path segment). Resolved via `getLocale()` with
 * an English fallback. Server code reads title/description only; the view
 * renders each entry's `Body` as real elements.
 *
 * Edit the per-locale scaffolds in the sibling modules — plain TSX, in place.
 */
export const LEGAL_CONTENT: Record<
  LegalLocale,
  Record<LegalPageType, LegalPageContent>
> = {
  en: {
    about: aboutContent.en,
    'privacy-policy': privacyPolicyContent.en,
    'terms-of-service': termsOfServiceContent.en,
    'cookie-policy': cookiePolicyContent.en,
    impressum: impressumContent.en,
  },
  de: {
    about: aboutContent.de,
    'privacy-policy': privacyPolicyContent.de,
    'terms-of-service': termsOfServiceContent.de,
    'cookie-policy': cookiePolicyContent.de,
    impressum: impressumContent.de,
  },
  fr: {
    about: aboutContent.fr,
    'privacy-policy': privacyPolicyContent.fr,
    'terms-of-service': termsOfServiceContent.fr,
    'cookie-policy': cookiePolicyContent.fr,
    impressum: impressumContent.fr,
  },
};

const LEGAL_LOCALES = new Set<string>(['en', 'de', 'fr']);

/** Resolve legal page content for the current chrome locale (en fallback). */
export function resolveLegalContent(type: LegalPageType): LegalPageContent {
  const locale = getLocale();
  const table = LEGAL_LOCALES.has(locale)
    ? LEGAL_CONTENT[locale as LegalLocale]
    : LEGAL_CONTENT.en;
  return table[type] ?? LEGAL_CONTENT.en[type];
}

/**
 * Resolve impressum legal-entity facts for the view.
 * Returns `null` when unset or both fields empty so the facts card is omitted.
 */
export function resolveLegalEntity() {
  if (!legalEntity) return null;
  const legalName = legalEntity.legalName?.trim() || null;
  const address = legalEntity.address?.trim() || null;
  if (!legalName && !address) return null;
  return { legalName, address };
}
