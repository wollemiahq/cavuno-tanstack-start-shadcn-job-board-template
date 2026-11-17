/**
 * Collection fields' verifiable items: one per verified selection, or per
 * repeatable row when the field has rows, with the details the check
 * covers. Only the profile owner's pages build these, from the owner reads,
 * so the details include private ones. The editor loads this with the
 * verification card, apart from the rest of the profile page.
 */
import { m } from '../paraglide/messages';
import {
  customFieldLabel,
  customFieldOptionLabel,
} from './custom-field-labels';
import { selectionDetailsId } from './profile-field-writes';

import type {
  ItemVerificationMethod,
  VerifiableItem,
} from './item-verification';
import type {
  MyItemVerification,
  ProfileObjectReferences,
} from '@cavuno/board';

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

type DetailDefinition = NonNullable<
  ProfileObjectReferences['definitions'][number]['valueDefinitions']
>[number];

/** One stored detail as text: option labels, Yes or No, no markup. */
function detailText(
  definition: DetailDefinition,
  value: Selection['values'][string],
): string {
  const option = (key: string) => {
    const found = definition.options?.find((entry) => entry.key === key);
    return found ? customFieldOptionLabel(definition.key, found) : key;
  };
  if (Array.isArray(value)) return value.map(option).join(', ');
  if (value === true) return m.jobDetail_customFieldYesLabel();
  if (value === false) return m.jobDetail_customFieldNoLabel();
  if (definition.type === 'single_select') return option(String(value));
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The checked details of one item, and whether any is still empty. */
function checkedDetails(
  definitions: readonly DetailDefinition[],
  checkedFieldKeys: readonly string[],
  values: Selection['values'],
) {
  const details: { label: string; text: string }[] = [];
  let missing = false;
  for (const definition of definitions) {
    if (!checkedFieldKeys.includes(definition.key)) continue;
    const value = values[definition.key];
    const text = value === undefined ? '' : detailText(definition, value);
    if (text) details.push({ label: customFieldLabel(definition), text });
    else missing = true;
  }
  return { details, missing };
}

/**
 * The stored collection selections the board verifies: a field with
 * verification set up (its definition carries `verification`), one item per
 * repeatable entry, or the selection itself when the field has no entries.
 */
export function collectionVerifiableItems(
  objectReferences: ProfileObjectReferences | null | undefined,
  verifications: ReadonlyMap<string, MyItemVerification>,
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
    const valueDefinitions = definition.valueDefinitions ?? [];
    const entryDefinitions = definition.entryDefinitions ?? [];
    for (const selection of objectReferences.selections) {
      if (selection.fieldKey !== definition.key) continue;
      const base = `ref:${selection.fieldKey}:${selection.recordId}`;
      const own = checkedDetails(
        valueDefinitions,
        config.checkedFieldKeys,
        selection.values,
      );
      const detailsId = selectionDetailsId(
        selection.fieldKey,
        selection.recordId,
      );
      if (entryDefinitions.length === 0) {
        const item: VerifiableItem = {
          itemKey: base,
          label: selection.titleOverride ?? selection.title,
          method,
          verification: verifications.get(base) ?? null,
          details: own.details,
        };
        if (own.missing) item.missingDetailsId = detailsId;
        items.push(item);
        continue;
      }
      for (const entry of selection.entries) {
        const itemKey = `${base}:${entry.key}`;
        const row = checkedDetails(
          entryDefinitions,
          config.checkedFieldKeys,
          entry.values,
        );
        const missingId = own.missing
          ? detailsId
          : row.missing
            ? selectionDetailsId(
                selection.fieldKey,
                selection.recordId,
                entry.key,
              )
            : null;
        const item: VerifiableItem = {
          itemKey,
          label: entryLabel(selection, entry, config.checkedFieldKeys),
          method,
          verification: verifications.get(itemKey) ?? null,
          details: [...own.details, ...row.details],
        };
        if (missingId) item.missingDetailsId = missingId;
        items.push(item);
      }
    }
  }
  return items;
}
