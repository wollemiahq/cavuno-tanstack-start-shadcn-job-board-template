'use client';

import { useId } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import {
  MAX_CUSTOM_FIELD_CLAUSES,
  MAX_CUSTOM_FIELD_VALUES,
  type CustomFilterField,
} from '@/lib/custom-field-filters';
import type { CustomFieldFilter } from '@cavuno/board';

function selectedValues(
  clauses: readonly CustomFieldFilter[],
  key: string,
): CustomFieldFilter['values'] {
  return clauses.find((clause) => clause.key === key)?.values ?? [];
}

/**
 * Set one field's values, keeping the other clauses in field order. An empty
 * selection removes the clause, so an unticked field sends nothing.
 */
function withFieldValues(
  fields: readonly CustomFilterField[],
  clauses: readonly CustomFieldFilter[],
  key: string,
  values: CustomFieldFilter['values'],
): CustomFieldFilter[] {
  return fields.flatMap((field) => {
    const next =
      field.key === key ? values : selectedValues(clauses, field.key);
    return next.length > 0 ? [{ key: field.key, values: [...next] }] : [];
  });
}

/**
 * The "All filters" sheet section for operator custom fields: a checkbox list
 * per select field (any ticked option matches) and a single checkbox per
 * yes/no field. Labels come from the board's field definitions.
 */
export function CustomFieldFilterFields({
  fields,
  value,
  onChange,
}: {
  fields: readonly CustomFilterField[];
  value: readonly CustomFieldFilter[];
  onChange: (next: CustomFieldFilter[]) => void;
}) {
  const idPrefix = useId();
  if (fields.length === 0) return null;

  return fields.map((field) => {
    const current = selectedValues(value, field.key);
    const fieldId = `${idPrefix}-${field.key}`;
    const fieldLimitReached =
      current.length === 0 &&
      value.filter((clause) => clause.values.length > 0).length >=
        MAX_CUSTOM_FIELD_CLAUSES;

    if (field.kind === 'flag') {
      return (
        <Field key={field.key} orientation="horizontal" className="min-h-8">
          <Checkbox
            id={fieldId}
            checked={current.includes(true)}
            disabled={fieldLimitReached}
            onCheckedChange={(checked) =>
              onChange(
                withFieldValues(
                  fields,
                  value,
                  field.key,
                  checked === true ? [true] : [],
                ),
              )
            }
          />
          <FieldLabel htmlFor={fieldId} className="cursor-pointer font-normal">
            {field.label}
          </FieldLabel>
        </Field>
      );
    }

    return (
      <FieldSet key={field.key} className="gap-3">
        <FieldLegend variant="label">{field.label}</FieldLegend>
        {field.options.map((option) => {
          const optionId = `${fieldId}-${option.value}`;
          return (
            <Field
              key={option.value}
              orientation="horizontal"
              className="min-h-8"
            >
              <Checkbox
                id={optionId}
                checked={current.includes(option.value)}
                disabled={
                  fieldLimitReached ||
                  (!current.includes(option.value) &&
                    current.length >= MAX_CUSTOM_FIELD_VALUES)
                }
                onCheckedChange={(checked) =>
                  onChange(
                    withFieldValues(
                      fields,
                      value,
                      field.key,
                      // Keep the operator's option order in the clause.
                      field.options
                        .map((candidate) => candidate.value)
                        .filter((candidate) =>
                          candidate === option.value
                            ? checked === true
                            : current.includes(candidate),
                        ),
                    ),
                  )
                }
              />
              <FieldLabel
                htmlFor={optionId}
                className="cursor-pointer font-normal"
              >
                {option.label}
              </FieldLabel>
            </Field>
          );
        })}
      </FieldSet>
    );
  });
}
