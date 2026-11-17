import { websiteDomain } from '@/lib/website-domain';
import type {
  CandidateEducation,
  CandidateExperience,
  MyItemVerification,
} from '@cavuno/board';

/**
 * Profile item verification view-model seam. A board switches verification
 * on per item type: experience and education in `board.context().verification`,
 * collection fields in their definition. The API reports each item's status
 * through `listVerifications`. Everything here turns those reads into what the
 * editor renders, and renders nothing for an item the board does not verify.
 */

/** How the worker confirms an item: by work or school email, or by asking the team. */
export type ItemVerificationMethod = 'email_domain' | 'team';

/** One verifiable item as the editor shows it. */
export type VerifiableItem = {
  itemKey: string;
  label: string;
  method: ItemVerificationMethod;
  verification: MyItemVerification | null;
  /**
   * The domain the work or school email should be at, when the item names a
   * website. A suggestion for the email field, not a rule: the Board API also
   * accepts a subdomain of it.
   */
  emailDomain?: string | null;
  /**
   * The details the check covers, as the owner's form holds them (private
   * ones too: only the owner's pages build these items). Collection items only.
   */
  details?: { label: string; text: string }[];
  /**
   * Where those details are edited, when one the check covers is empty:
   * the item then asks for them before it can be verified.
   */
  missingDetailsId?: string;
};

/** The API's item keys for built-in entries. */
export function experienceItemKey(id: string): string {
  return `experience:${id}`;
}

export function educationItemKey(id: string): string {
  return `education:${id}`;
}

/** Verifications by item key; an unreadable list reads as empty. */
export function verificationsByKey(
  list: { data: MyItemVerification[] } | null | undefined,
): ReadonlyMap<string, MyItemVerification> {
  return new Map((list?.data ?? []).map((row) => [row.itemKey, row]));
}

/** Whether the worker may ask now; an item the API lists no row for may. */
export function canRequestVerification(
  verification: Pick<MyItemVerification, 'nextStep'> | null,
): boolean {
  return verification === null || verification.nextStep !== 'none';
}

/** Whether an email-domain item may start an email check now; otherwise it goes to the team. */
export function canCheckByEmail(
  verification: Pick<MyItemVerification, 'nextStep'> | null,
): boolean {
  return verification === null || verification.nextStep === 'email';
}

/**
 * Whether the item is checked by email now. The API's `nextStep` decides;
 * an item with no row goes by its method.
 */
export function checksByEmail(
  item: Pick<VerifiableItem, 'method' | 'verification'>,
): boolean {
  if (item.verification) return canCheckByEmail(item.verification);
  return item.method === 'email_domain';
}

/**
 * A built-in experience entry, when the board verifies experience
 * (`board.context().verification.experience`). Pass `null` verifications when
 * it does not. Every entry then shows its status, unverified until the API
 * lists one. A current job with a company website is checked by work email;
 * any other entry goes to the team.
 */
export function experienceVerifiableItem(
  item: Pick<
    CandidateExperience,
    'id' | 'companyName' | 'companyUrl' | 'endDate'
  >,
  verifications: ReadonlyMap<string, MyItemVerification> | null,
): VerifiableItem | null {
  if (!verifications) return null;
  const itemKey = experienceItemKey(item.id);
  const emailDomain = websiteDomain(item.companyUrl);
  return {
    itemKey,
    label: item.companyName,
    method: !item.endDate && emailDomain ? 'email_domain' : 'team',
    verification: verifications.get(itemKey) ?? null,
    emailDomain: emailDomain ?? null,
  };
}

/**
 * A built-in education entry, when the board verifies education
 * (`board.context().verification.education`), on the same terms as experience.
 */
export function educationVerifiableItem(
  item: Pick<CandidateEducation, 'id' | 'institutionName' | 'institutionUrl'>,
  verifications: ReadonlyMap<string, MyItemVerification> | null,
): VerifiableItem | null {
  if (!verifications) return null;
  const itemKey = educationItemKey(item.id);
  const emailDomain = websiteDomain(item.institutionUrl);
  return {
    itemKey,
    label: item.institutionName,
    method: emailDomain ? 'email_domain' : 'team',
    verification: verifications.get(itemKey) ?? null,
    emailDomain: emailDomain ?? null,
  };
}
