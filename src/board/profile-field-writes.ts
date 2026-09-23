/**
 * Write rules shared by the company and talent profile forms for their
 * operator-defined fields:
 *
 *   - custom field values are an additive merge: send only the keys the
 *     person changed, `null` for an answer they cleared;
 *   - collection selections are a full replace of the editable set: keep
 *     every stored selection of a field the form does not render (a hidden
 *     field keeps its value), keep each surviving selection's own details
 *     and wording, and send nothing at all when no rendered field changed.
 */

import type { CollectionChoice } from './form-layout';
import type {
  ProfileFieldValues,
  ProfileObjectReferences,
  ReplaceProfileObjectReferencesBody,
} from '@cavuno/board';

export type ProfileFieldValue = ProfileFieldValues['values'][string];
type Selection = ProfileObjectReferences['selections'][number];
type SelectionWrite = ReplaceProfileObjectReferencesBody['selections'][number];

/** Selections per collection field key, as the pickers hold them. */
export type ProfileSelections = Record<string, CollectionChoice[]>;

/** The stored selections grouped per field, in stored order. */
export function initialProfileSelections(selections: readonly Selection[]) {
  const keys = [...new Set(selections.map((selection) => selection.fieldKey))];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      selections
        .filter((selection) => selection.fieldKey === key)
        .map(
          (selection): CollectionChoice => ({
            id: selection.recordId,
            name: selection.title,
          }),
        ),
    ]),
  );
}

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function isEmpty(value: ProfileFieldValue | undefined | null) {
  if (value === undefined || value === null || value === '') return true;
  return Array.isArray(value) && value.length === 0;
}

/**
 * The additive custom-field write: the rendered keys whose value changed,
 * with `null` for a cleared answer. `null` when nothing changed.
 */
export function profileCustomFieldsBody(
  renderedKeys: readonly string[],
  values: Readonly<Record<string, ProfileFieldValue>>,
  stored: Readonly<Record<string, ProfileFieldValue>>,
): Record<string, ProfileFieldValue | null> | null {
  const body: Record<string, ProfileFieldValue | null> = {};
  for (const key of renderedKeys) {
    const next = values[key];
    const before = stored[key];
    if (next === undefined || isEmpty(next)) {
      if (!isEmpty(before)) body[key] = null;
      continue;
    }
    const changed = Array.isArray(next)
      ? !Array.isArray(before) || !sameList(next, before)
      : next !== before;
    if (changed) body[key] = next;
  }
  return Object.keys(body).length > 0 ? body : null;
}

function toWrite(selection: Selection): SelectionWrite {
  const write: SelectionWrite = {
    fieldKey: selection.fieldKey,
    recordId: selection.recordId,
    values: selection.values,
    entries: selection.entries,
  };
  if (selection.titleOverride !== undefined) {
    write.titleOverride = selection.titleOverride;
  }
  if (selection.descriptionOverride !== undefined) {
    write.descriptionOverride = selection.descriptionOverride;
  }
  return write;
}

/**
 * The full replacement selection set, or `null` when no rendered field
 * changed. Fields the form does not render keep their stored selections;
 * a kept entry keeps its details and wording; a new entry is sent bare.
 */
export function profileObjectReferencesBody(
  renderedKeys: readonly string[],
  current: ProfileSelections,
  stored: readonly Selection[],
): ReplaceProfileObjectReferencesBody | null {
  const rendered = new Set(renderedKeys);
  const storedIds = (key: string) =>
    stored
      .filter((selection) => selection.fieldKey === key)
      .map((selection) => selection.recordId);
  const changed = renderedKeys.some(
    (key) =>
      !sameList(
        (current[key] ?? []).map((choice) => choice.id),
        storedIds(key),
      ),
  );
  if (!changed) return null;

  const selections: SelectionWrite[] = stored
    .filter((selection) => !rendered.has(selection.fieldKey))
    .map(toWrite);
  for (const key of renderedKeys) {
    for (const choice of current[key] ?? []) {
      const kept = stored.find(
        (selection) =>
          selection.fieldKey === key && selection.recordId === choice.id,
      );
      selections.push(
        kept ? toWrite(kept) : { fieldKey: key, recordId: choice.id },
      );
    }
  }
  return { selections };
}
