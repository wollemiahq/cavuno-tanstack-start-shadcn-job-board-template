import type {
  CandidateEducation,
  CandidateExperience,
  ItemVerification,
  ProfileObjectReferences,
} from '@cavuno/board';

/**
 * Profile item verification view-model seam. A board switches verification
 * on per item type; the API then reports each item's status through
 * `listVerifications`. Everything here turns those reads into what the
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

/**
 * A built-in experience entry, when the board verifies it. The Board API
 * does not say whether experience verification is switched on, so an entry
 * counts only once the API lists a verification for it. A current job with a
 * company website is checked by work email; any other entry goes to the team.
 */
export function experienceVerifiableItem(
  item: Pick<
    CandidateExperience,
    'id' | 'companyName' | 'companyUrl' | 'endDate'
  >,
  verifications: ReadonlyMap<string, ItemVerification>,
): VerifiableItem | null {
  const itemKey = experienceItemKey(item.id);
  const verification = verifications.get(itemKey);
  if (!verification) return null;
  return {
    itemKey,
    label: item.companyName,
    method: !item.endDate && item.companyUrl ? 'email_domain' : 'team',
    verification,
  };
}

/** A built-in education entry, on the same terms as experience. */
export function educationVerifiableItem(
  item: Pick<CandidateEducation, 'id' | 'institutionName' | 'institutionUrl'>,
  verifications: ReadonlyMap<string, ItemVerification>,
): VerifiableItem | null {
  const itemKey = educationItemKey(item.id);
  const verification = verifications.get(itemKey);
  if (!verification) return null;
  return {
    itemKey,
    label: item.institutionName,
    method: item.institutionUrl ? 'email_domain' : 'team',
    verification,
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

/** The public badge's domain line, when it was verified by email domain. */
export function verificationBadge(
  badge: { status: 'verified'; verifiedDomain: string | null } | undefined,
): { verifiedDomain: string | null } | null {
  return badge?.status === 'verified'
    ? { verifiedDomain: badge.verifiedDomain }
    : null;
}
