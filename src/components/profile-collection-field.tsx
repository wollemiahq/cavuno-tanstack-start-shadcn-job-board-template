'use client';

import type { ProfileCollectionDefinition } from '@/board/form-layout';
import {
  withPickedChoices,
  type ProfileSelection,
} from '@/board/profile-field-writes';
import {
  CollectionFieldPicker,
  type CollectionChoiceLoader,
} from '@/components/collection-field-picker';
import {
  CollectionSelectionDetails,
  type SelectionDetailErrors,
} from '@/components/collection-selection-details';

/**
 * A company or talent collection field: the picker, then the details and
 * repeatable rows of each chosen entry when the field defines them.
 */
export function ProfileCollectionField({
  definition,
  value,
  onChange,
  loadChoices,
  error,
  detailErrors,
}: {
  definition: ProfileCollectionDefinition;
  value: readonly ProfileSelection[];
  onChange: (value: ProfileSelection[]) => void;
  loadChoices: CollectionChoiceLoader;
  error?: string | null;
  detailErrors?: SelectionDetailErrors;
}) {
  const hasDetails =
    Boolean(definition.valueDefinitions?.length) ||
    Boolean(definition.entryDefinitions?.length);
  return (
    <>
      <CollectionFieldPicker
        definition={definition}
        value={value}
        onChange={(picked) => onChange(withPickedChoices(value, picked))}
        loadChoices={loadChoices}
        error={error}
      />
      {hasDetails && value.length > 0 ? (
        <CollectionSelectionDetails
          definition={definition}
          value={value}
          onChange={onChange}
          errors={detailErrors}
        />
      ) : null}
    </>
  );
}
