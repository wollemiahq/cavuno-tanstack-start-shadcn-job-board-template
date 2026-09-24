'use client';

import { useEffect, useRef, useState } from 'react';

import { Search } from 'lucide-react';

import { m } from '../paraglide/messages';

import { customFieldLabel } from '@/board/custom-field-labels';
import type { CollectionChoice } from '@/board/form-layout';
import type { LocationSuggestionVM } from '@/board/location-suggestion';
import { PlaceTagsField } from '@/components/place-tags-field';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';

export type { CollectionChoice };

/** Loads a field's active choices for a search term ('' for the first page). */
export type CollectionChoiceLoader = (
  search: string,
) => Promise<CollectionChoice[]>;

/** The system ceiling on selections when a definition sets no maximum. */
const MAX_SELECTIONS = 100;
const DEBOUNCE_MS = 200;

/**
 * How many entries a collection field accepts: one when it is not
 * `multiple`, otherwise the operator's `maxSelections`, capped at the
 * system ceiling of 100 when absent.
 */
export function collectionSelectionCap(definition: {
  multiple: boolean;
  maxSelections?: number;
}): number {
  if (!definition.multiple) return 1;
  return Math.min(definition.maxSelections ?? MAX_SELECTIONS, MAX_SELECTIONS);
}

function toSuggestion(choice: CollectionChoice): LocationSuggestionVM {
  return {
    id: choice.id,
    slug: choice.id,
    name: choice.name,
    contextLabel: null,
    countryCode: null,
    regionCode: null,
  };
}

/** Debounced choice search for one field; the first page loads on mount. */
function useCollectionChoices(loadChoices: CollectionChoiceLoader) {
  const [query, setQuery] = useState('');
  const [choices, setChoices] = useState<CollectionChoice[]>([]);
  const [loading, setLoading] = useState(false);
  // Callers pass an inline loader; only a new query should refetch.
  const loader = useRef(loadChoices);
  useEffect(() => {
    loader.current = loadChoices;
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(
      () => {
        loader
          .current(query.trim())
          .then((next) => {
            if (!cancelled) setChoices(next);
          })
          .catch(() => {
            // A failed search leaves the list empty; the stored selection and
            // the rest of the form stay usable.
            if (!cancelled) setChoices([]);
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      },
      query ? DEBOUNCE_MS : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { choices, loading, onQueryChange: setQuery };
}

/**
 * A collection reference field: the entries chosen from an operator
 * collection (benefits, technologies, certifications). Chosen entries show
 * as removable tags over a search of the field's active choices; the picker
 * stops at the field's selection cap. The value is the ordered selection;
 * callers send its record `id`s, never names.
 */
export function CollectionFieldPicker({
  definition,
  value,
  onChange,
  loadChoices,
  error,
}: {
  definition: {
    key: string;
    label: string;
    multiple: boolean;
    maxSelections?: number;
  };
  value: readonly CollectionChoice[];
  onChange: (value: CollectionChoice[]) => void;
  loadChoices: CollectionChoiceLoader;
  /** A validation message to show under the field. */
  error?: string | null;
}) {
  const id = `collection-field-${definition.key}`;
  const cap = collectionSelectionCap(definition);
  const full = value.length >= cap;
  const { choices, loading, onQueryChange } = useCollectionChoices(loadChoices);

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{customFieldLabel(definition)}</FieldLabel>
      <PlaceTagsField
        id={id}
        icon={<Search aria-hidden="true" />}
        disabled={full}
        tags={value.map((choice) => ({ key: choice.id, label: choice.name }))}
        suggestions={full ? [] : choices.map(toSuggestion)}
        loading={loading}
        onQueryChange={onQueryChange}
        onAddSuggestion={(suggestion) => {
          if (full || value.some((choice) => choice.id === suggestion.id)) {
            return;
          }
          onChange([...value, { id: suggestion.id, name: suggestion.name }]);
        }}
        onRemove={(key) =>
          onChange(value.filter((choice) => choice.id !== key))
        }
        placeholder={m.collectionField_searchPlaceholder()}
        searchingText={m.locationCombobox_searchingText()}
        removeAriaLabel={(name) => m.placeTags_removeAriaLabel({ name })}
      />
      {/* Only an operator-set maximum is worth announcing; the system
          ceiling applied when there is none is not a rule to choose by. */}
      {cap > 1 && definition.maxSelections != null ? (
        <FieldDescription>
          {m.collectionField_maxSelectionsText({ count: cap })}
        </FieldDescription>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
