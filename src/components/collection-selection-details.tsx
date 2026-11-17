'use client';

import { PlusIcon, XIcon } from 'lucide-react';

import { m } from '../paraglide/messages';

import type { ProfileCollectionDefinition } from '@/board/form-layout';
import {
  newEntryKey,
  selectionDetailsId,
  type ProfileDetailValues,
  type ProfileSelection,
} from '@/board/profile-field-writes';
import {
  CustomFieldInput,
  isCustomFieldEmpty,
} from '@/components/custom-fields-group';
import { Button } from '@/components/ui/button';
import { FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';

type DetailDefinition = NonNullable<
  ProfileCollectionDefinition['valueDefinitions']
>[number];

/** Where a detail's message comes from: this form's check, or the API. */
export type SelectionDetailErrors = {
  /** The one input this form's own check flagged, by DOM id. */
  invalid?: { id: string; message: string } | null;
  /** The API's refusals by detail field key; a required one marks only empty inputs. */
  byKey?: Readonly<Record<string, { code: string; message: string }>>;
};

function DetailInputs({
  definitions,
  values,
  idPrefix,
  errors,
  onChange,
}: {
  definitions: readonly DetailDefinition[];
  values: ProfileDetailValues;
  idPrefix: string;
  errors: SelectionDetailErrors;
  onChange: (values: ProfileDetailValues) => void;
}) {
  return definitions.map((definition) => {
    const id = `${idPrefix}-${definition.key}`;
    const value = values[definition.key];
    const refused = errors.byKey?.[definition.key];
    const error =
      errors.invalid?.id === id
        ? errors.invalid.message
        : refused &&
            (refused.code !== 'custom_field_required' ||
              isCustomFieldEmpty(value))
          ? refused.message
          : null;
    return (
      <CustomFieldInput
        key={definition.key}
        id={id}
        definition={definition}
        value={value}
        readOnly={!definition.editableByOwner}
        error={error}
        onChange={(next) => onChange({ ...values, [definition.key]: next })}
      />
    );
  });
}

/**
 * The details under each chosen entry of a collection field: the entry's
 * own fields (`valueDefinitions`), then its repeatable rows
 * (`entryDefinitions`), each row with a key that stays the same across
 * edits. Drawn with the same inputs as the form's other custom fields.
 */
export function CollectionSelectionDetails({
  definition,
  value,
  onChange,
  errors = {},
}: {
  definition: ProfileCollectionDefinition;
  value: readonly ProfileSelection[];
  onChange: (value: ProfileSelection[]) => void;
  errors?: SelectionDetailErrors;
}) {
  const valueDefinitions = definition.valueDefinitions ?? [];
  const entryDefinitions = definition.entryDefinitions ?? [];
  // The API keeps a stored row with a board-managed answer, so it stays.
  const locksStoredRows = entryDefinitions.some(
    (detail) => !detail.editableByOwner,
  );

  return value.map((selection, index) => {
    const update = (next: Partial<ProfileSelection>) =>
      onChange(
        value.map((current, at) =>
          at === index ? { ...current, ...next } : current,
        ),
      );
    const sectionId = selectionDetailsId(definition.key, selection.id);
    return (
      <FieldSet
        key={selection.id}
        id={sectionId}
        className="rounded-2xl border p-4"
      >
        <FieldLegend variant="label">{selection.name}</FieldLegend>
        <FieldGroup className="gap-4">
          <DetailInputs
            definitions={valueDefinitions}
            values={selection.values}
            idPrefix={sectionId}
            errors={errors}
            onChange={(values) => update({ values })}
          />
          {selection.entries.map((entry, row) => {
            const rowId = selectionDetailsId(
              definition.key,
              selection.id,
              entry.key,
            );
            const number = row + 1;
            return (
              <FieldSet
                key={entry.key}
                id={rowId}
                className="rounded-2xl border p-4"
              >
                <FieldLegend variant="label">
                  {m.collectionField_entryLegend({ number })}
                </FieldLegend>
                <FieldGroup className="gap-4">
                  <DetailInputs
                    definitions={entryDefinitions}
                    values={entry.values}
                    idPrefix={rowId}
                    errors={errors}
                    onChange={(values) =>
                      update({
                        entries: selection.entries.map((current) =>
                          current.key === entry.key
                            ? { ...current, values }
                            : current,
                        ),
                      })
                    }
                  />
                  {locksStoredRows && entry.stored ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-fit"
                      aria-label={m.collectionField_removeEntryAriaLabel({
                        number,
                      })}
                      onClick={() =>
                        update({
                          entries: selection.entries.filter(
                            (current) => current.key !== entry.key,
                          ),
                        })
                      }
                    >
                      <XIcon data-icon="inline-start" aria-hidden="true" />
                      {m.collectionField_removeEntryLabel()}
                    </Button>
                  )}
                </FieldGroup>
              </FieldSet>
            );
          })}
          {entryDefinitions.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() =>
                update({
                  entries: [
                    ...selection.entries,
                    { key: newEntryKey(), values: {} },
                  ],
                })
              }
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              {m.collectionField_addEntryLabel()}
            </Button>
          ) : null}
        </FieldGroup>
      </FieldSet>
    );
  });
}
