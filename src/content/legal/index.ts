import { aboutContent } from './about';
import { cookiePolicyContent } from './cookie-policy';
import { impressumContent } from './impressum';
import { privacyPolicyContent } from './privacy-policy';
import { termsOfServiceContent } from './terms-of-service';
import { legalEntity } from './types';

import type { LegalPageContent, LegalPageType } from './types';

export { legalEntity } from './types';
export type { LegalEntityConfig, LegalPageContent } from './types';

/**
 * Application-owned legal/about content, keyed by `LegalPageType` (also the
 * URL path segment). Server code reads title/description only; the view
 * renders each entry's `Body` as real elements.
 */
export const LEGAL_CONTENT: Record<LegalPageType, LegalPageContent> = {
  about: aboutContent,
  'privacy-policy': privacyPolicyContent,
  'terms-of-service': termsOfServiceContent,
  'cookie-policy': cookiePolicyContent,
  impressum: impressumContent,
};

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
