import type {
  CandidateEducation,
  CandidateExperience,
  ItemVerification,
  ProfileObjectReferences,
} from '@cavuno/board';

/**
 * Profile item verification view-model seam. A board switches verification
 * on per item type: experience and education in `board.context().verification`,
 * collection fields in their definition. The API reports each item's status
 * through `listVerifications`. Everything here turns those reads into what the
 * editor renders, and renders nothing for an item the board does not verify.
 */

export type ItemVerificationStatus = ItemVerification['status'];

/** How the worker confirms an item: by work or school email, or by asking the team. */
export type ItemVerificationMethod = 'email_domain' | 'team';

/** One verifiable item as the editor shows it. */
export type VerifiableItem = {
  itemKey: string;
  label: string;
  method: ItemVerificationMethod;
  verification: ItemVerification | null;
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
  list: { data: ItemVerification[] } | null | undefined,
): ReadonlyMap<string, ItemVerification> {
  return new Map((list?.data ?? []).map((row) => [row.itemKey, row]));
}

/** Statuses from which the worker may ask again, per the Board API. */
const REQUESTABLE: ReadonlySet<ItemVerificationStatus> = new Set([
  'unverified',
  'changed',
  'lapsed',
  'rejected',
  'needs_info',
  'unable_to_verify',
]);

export function canRequestVerification(
  verification: Pick<ItemVerification, 'status'> | null,
): boolean {
  return REQUESTABLE.has(verification?.status ?? 'unverified');
}

/** Statuses from which the Board API accepts an email-domain check. */
const EMAIL_CHECKABLE: ReadonlySet<ItemVerificationStatus> = new Set([
  'unverified',
  'changed',
  'lapsed',
  'unable_to_verify',
]);

/** Whether an email-domain item may start an email check now; otherwise it goes to the team. */
export function canCheckByEmail(
  verification: Pick<ItemVerification, 'status'> | null,
): boolean {
  return EMAIL_CHECKABLE.has(verification?.status ?? 'unverified');
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
  verifications: ReadonlyMap<string, ItemVerification> | null,
): VerifiableItem | null {
  if (!verifications) return null;
  const itemKey = experienceItemKey(item.id);
  return {
    itemKey,
    label: item.companyName,
    method: !item.endDate && item.companyUrl ? 'email_domain' : 'team',
    verification: verifications.get(itemKey) ?? null,
  };
}

/**
 * A built-in education entry, when the board verifies education
 * (`board.context().verification.education`), on the same terms as experience.
 */
export function educationVerifiableItem(
  item: Pick<CandidateEducation, 'id' | 'institutionName' | 'institutionUrl'>,
  verifications: ReadonlyMap<string, ItemVerification> | null,
): VerifiableItem | null {
  if (!verifications) return null;
  const itemKey = educationItemKey(item.id);
  return {
    itemKey,
    label: item.institutionName,
    method: item.institutionUrl ? 'email_domain' : 'team',
    verification: verifications.get(itemKey) ?? null,
  };
}

type Selection = ProfileObjectReferences['selections'][number];

function entryLabel(
  selection: Selection,
  entry: Selection['entries'][number],
  checkedFieldKeys: readonly string[],
): string {
  // Text, number and list values name the entry; a yes/no answer does not.
  const detail = checkedFieldKeys
    .flatMap((key) => {
      const value = entry.values[key];
      if (value === undefined || value === true || value === false) return [];
      return [value].flat().map(String);
    })
    .map((text) => text.trim())
    .filter(Boolean)
    .join(', ');
  const title = selection.titleOverride ?? selection.title;
  return detail ? `${title}: ${detail}` : title;
}

/**
 * The stored collection selections the board verifies: a field with
 * verification set up (its definition carries `verification`), one item per
 * repeatable entry, or the selection itself when the field has no entries.
 */
export function collectionVerifiableItems(
  objectReferences: ProfileObjectReferences | null | undefined,
  verifications: ReadonlyMap<string, ItemVerification>,
  options: { emailDomain: boolean },
): VerifiableItem[] {
  if (!objectReferences) return [];
  const items: VerifiableItem[] = [];
  for (const definition of objectReferences.definitions) {
    const config = definition.verification;
    if (!config) continue;
    const method: ItemVerificationMethod =
      options.emailDomain && config.verifiedBy === 'email_domain'
        ? 'email_domain'
        : 'team';
    const hasEntries = (definition.entryDefinitions?.length ?? 0) > 0;
    for (const selection of objectReferences.selections) {
      if (selection.fieldKey !== definition.key) continue;
      const base = `ref:${selection.fieldKey}:${selection.recordId}`;
      if (!hasEntries) {
        items.push({
          itemKey: base,
          label: selection.titleOverride ?? selection.title,
          method,
          verification: verifications.get(base) ?? null,
        });
        continue;
      }
      for (const entry of selection.entries) {
        const itemKey = `${base}:${entry.key}`;
        items.push({
          itemKey,
          label: entryLabel(selection, entry, config.checkedFieldKeys),
          method,
          verification: verifications.get(itemKey) ?? null,
        });
      }
    }
  }
  return items;
}
