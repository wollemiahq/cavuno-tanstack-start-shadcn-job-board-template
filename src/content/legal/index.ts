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
export const LEGAL_CONTENT = {
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
  es: {
    about: aboutContent.es,
    'privacy-policy': privacyPolicyContent.es,
    'terms-of-service': termsOfServiceContent.es,
    'cookie-policy': cookiePolicyContent.es,
    impressum: impressumContent.es,
  },
  pl: {
    about: aboutContent.pl,
    'privacy-policy': privacyPolicyContent.pl,
    'terms-of-service': termsOfServiceContent.pl,
    'cookie-policy': cookiePolicyContent.pl,
    impressum: impressumContent.pl,
  },
} satisfies Record<LegalLocale, Record<LegalPageType, LegalPageContent>>;

/**
 * Legal/about pages still carrying `<LegalPlaceholderCallout>`.
 *
 * A placeholder policy must not be indexed under the operator's brand: these
 * pages ship saying "Do not ship it as a real policy", they are linked from
 * every footer, and `marketing.xml` submits them to Google. `getLegalPageView`
 * emits `robots: noindex` for everything listed here, so a fork that has not
 * written its policies yet is not asking to be indexed with template
 * scaffolding under its own domain.
 *
 * OPERATOR: delete a page's entry in the same edit that deletes its callout —
 * leaving it listed keeps your real policy out of the index.
 * `placeholder-noindex.test.ts` fails if the two ever drift.
 */
export const LEGAL_PLACEHOLDER_PAGES: ReadonlySet<LegalPageType> = new Set([
  'about',
  'privacy-policy',
  'terms-of-service',
  'cookie-policy',
  'impressum',
]);

/** Is this page still template scaffolding rather than the operator's own copy? */
export function isLegalPlaceholder(type: LegalPageType): boolean {
  return LEGAL_PLACEHOLDER_PAGES.has(type);
}

const LEGAL_LOCALES = [
  'en',
  'de',
  'fr',
  'es',
  'pl',
] as const satisfies readonly LegalLocale[];

function resolveLegalLocale(locale: string): LegalLocale {
  return LEGAL_LOCALES.find((candidate) => candidate === locale) ?? 'en';
}

/** Resolve legal page content for the current chrome locale (en fallback). */
export function resolveLegalContent(type: LegalPageType): LegalPageContent {
  return LEGAL_CONTENT[resolveLegalLocale(getLocale())][type];
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
