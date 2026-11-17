/**
 * Write rules shared by the company and talent profile forms for their
 * operator-defined fields:
 *
 *   - custom field values are an additive merge: send only the keys the
 *     person changed, `null` for an answer they cleared;
 *   - collection selections are a full replace of the owner-editable set:
 *     keep every stored selection of an editable field the form does not
 *     render (a hidden field keeps its value), keep each surviving
 *     selection's wording, send the details and repeatable rows the form
 *     holds for it, and send nothing at all when no rendered field changed.
 *     Selections of fields the owner may not edit are never sent: the API
 *     keeps those itself and rejects a resent one that differs from storage
 *     in any detail.
 */

import type {
  CollectionChoice,
  ProfileCollectionDefinition,
} from './form-layout';
import type {
  ProfileFieldValues,
  ProfileObjectReferences,
  ReplaceProfileObjectReferencesBody,
} from '@cavuno/board';

export type ProfileFieldValue = ProfileFieldValues['values'][string];
type Selection = ProfileObjectReferences['selections'][number];
type SelectionWrite = ReplaceProfileObjectReferencesBody['selections'][number];
type DetailDefinition = NonNullable<
  ProfileCollectionDefinition['valueDefinitions']
>[number];

/** Typed details keyed by detail field key. */
export type ProfileDetailValues = Record<string, ProfileFieldValue>;

/**
 * One repeatable row of a selection. `key` stays the same across edits;
 * `stored` marks a row the profile already saved.
 */
export type ProfileSelectionEntry = {
  key: string;
  values: ProfileDetailValues;
  stored?: true;
};

/**
 * One chosen collection entry as the form edits it: the entry, its own
 * details (`values`) and its repeatable rows (`entries`).
 */
export type ProfileSelection = CollectionChoice & {
  values: ProfileDetailValues;
  entries: ProfileSelectionEntry[];
};

/** Selections per collection field key, as the form holds them. */
export type ProfileSelections = Record<string, ProfileSelection[]>;

/** The stored selections grouped per field, in stored order. */
export function initialProfileSelections(selections: readonly Selection[]) {
  const grouped: ProfileSelections = {};
  for (const selection of selections) {
    (grouped[selection.fieldKey] ??= []).push({
      id: selection.recordId,
      name: selection.title,
      values: selection.values,
      entries: selection.entries.map(({ key, values }) => ({
        key,
        values,
        stored: true,
      })),
    });
  }
  return grouped;
}

/**
 * The picker's new list, each kept entry with the details already typed for
 * it and each newly picked one with none.
 */
export function withPickedChoices(
  current: readonly ProfileSelection[],
  picked: readonly CollectionChoice[],
): ProfileSelection[] {
  return picked.map(
    (choice) =>
      current.find((selection) => selection.id === choice.id) ?? {
        ...choice,
        values: {},
        entries: [],
      },
  );
}

/** A key for a new repeatable row: the API wants a letter first. */
export function newEntryKey(): string {
  return `e${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

/** The DOM id of a selection's details, or of one of its rows. */
export function selectionDetailsId(
  fieldKey: string,
  recordId: string,
  entryKey?: string,
): string {
  return ['details', fieldKey, recordId, entryKey].filter(Boolean).join('-');
}

/**
 * The first required detail left empty under a chosen entry, with the DOM id
 * of its input (`<details id>-<detail key>`). A required Yes/No is never
 * missing: an untouched one is sent as No. Board-managed details are the
 * board's to fill.
 */
export function missingSelectionDetail(
  definition: ProfileCollectionDefinition,
  selections: readonly ProfileSelection[] | undefined,
): { id: string; definition: DetailDefinition } | null {
  const first = (
    definitions: readonly DetailDefinition[] | undefined,
    values: ProfileDetailValues,
    prefix: string,
  ) => {
    const missing = definitions?.find(
      (detail) =>
        detail.required &&
        detail.editableByOwner &&
        detail.type !== 'boolean' &&
        isEmpty(values[detail.key]),
    );
    return missing
      ? { id: `${prefix}-${missing.key}`, definition: missing }
      : null;
  };
  for (const selection of selections ?? []) {
    const found =
      first(
        definition.valueDefinitions,
        selection.values,
        selectionDetailsId(definition.key, selection.id),
      ) ??
      selection.entries
        .map((entry) =>
          first(
            definition.entryDefinitions,
            entry.values,
            selectionDetailsId(definition.key, selection.id, entry.key),
          ),
        )
        .find(Boolean);
    if (found) return found;
  }
  return null;
}

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function isEmpty(value: ProfileFieldValue | undefined | null) {
  if (value === undefined || value === null || value === '') return true;
  return Array.isArray(value) && value.length === 0;
}

/**
 * Required Yes/No answers with nothing stored, as No. The API requires an
 * answer to every required field, and an untouched checkbox means No.
 */
export function withUnsetRequiredBooleans(
  definitions: ReadonlyArray<{ key: string; type?: string; required: boolean }>,
  values: Readonly<ProfileDetailValues>,
) {
  const unset = definitions.filter(
    ({ key, type, required }) =>
      required && type === 'boolean' && isEmpty(values[key]),
  );
  return {
    ...values,
    ...Object.fromEntries(unset.map(({ key }) => [key, false])),
  };
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

/**
 * Details as the API takes them: only defined keys, empty answers left out,
 * an unset required Yes/No as No. Without definitions (an older API) the
 * stored details go back as they are.
 */
function detailValues(
  definitions: readonly DetailDefinition[] | undefined,
  values: ProfileDetailValues,
): ProfileDetailValues {
  if (!definitions?.length) return values;
  const filled = withUnsetRequiredBooleans(definitions, values);
  return Object.fromEntries(
    definitions.flatMap(({ key }) =>
      isEmpty(filled[key]) ? [] : [[key, filled[key]!]],
    ),
  );
}

function toWrite(
  fieldKey: string,
  selection: ProfileSelection,
  definition: ProfileCollectionDefinition | undefined,
  stored: Selection | undefined,
): SelectionWrite {
  const write: SelectionWrite = { fieldKey, recordId: selection.id };
  const values = detailValues(definition?.valueDefinitions, selection.values);
  if (Object.keys(values).length > 0) write.values = values;
  if (selection.entries.length > 0) {
    write.entries = selection.entries.map(({ key, values: row }) => ({
      key,
      values: detailValues(definition?.entryDefinitions, row),
    }));
  }
  if (stored?.titleOverride !== undefined) {
    write.titleOverride = stored.titleOverride;
  }
  if (stored?.descriptionOverride !== undefined) {
    write.descriptionOverride = stored.descriptionOverride;
  }
  return write;
}

/** What a rendered field's selections send, for change detection. */
function signature(selections: readonly ProfileSelection[] | undefined) {
  return JSON.stringify(
    (selections ?? []).map(({ id, values, entries }) => [id, values, entries]),
  );
}

/**
 * The full replacement selection set, or `null` when no rendered field
 * changed. Editable fields the form does not render keep their stored
 * selections; every rendered selection sends the details the form holds and
 * keeps its stored wording. `definitions` are the owner read's, which say
 * which fields the owner may edit and what details each one has.
 */
export function profileObjectReferencesBody(
  renderedKeys: readonly string[],
  current: ProfileSelections,
  stored: readonly Selection[],
  definitions: readonly ProfileCollectionDefinition[],
): ReplaceProfileObjectReferencesBody | null {
  const rendered = new Set(renderedKeys);
  const byKey = new Map(
    definitions.map((definition) => [definition.key, definition]),
  );
  const before = initialProfileSelections(stored);
  const changed = renderedKeys.some(
    (key) => signature(current[key]) !== signature(before[key]),
  );
  if (!changed) return null;

  const storedOf = (fieldKey: string, recordId: string) =>
    stored.find(
      (selection) =>
        selection.fieldKey === fieldKey && selection.recordId === recordId,
    );
  const selections: SelectionWrite[] = [];
  for (const [key, list] of Object.entries(before)) {
    if (!byKey.get(key)?.editableByOwner || rendered.has(key)) continue;
    for (const selection of list) {
      selections.push(
        toWrite(key, selection, undefined, storedOf(key, selection.id)),
      );
    }
  }
  for (const key of renderedKeys) {
    for (const selection of current[key] ?? []) {
      selections.push(
        toWrite(key, selection, byKey.get(key), storedOf(key, selection.id)),
      );
    }
  }
  return { selections };
}
