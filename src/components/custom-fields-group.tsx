'use client';

import { m } from '../paraglide/messages';

import {
  customFieldLabel,
  customFieldOptionLabel,
} from '@/board/custom-field-labels';
import type { ProfileCustomDefinition } from '@/board/form-layout';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { searchString } from '@/lib/pagination';
import type { PublicBoard } from '@cavuno/board';

type JobCustomFieldDefinition = PublicBoard['customFields']['job'][number];
/**
 * A job custom field, or a company / talent profile custom field. Profile
 * fields add `date`, `url`, `email` and `phone`, which render as the
 * matching native input; the types without an owner input here
 * (`rich_text`, `image_gallery`, `file`) render nothing.
 */
type CustomFieldDefinition = JobCustomFieldDefinition | ProfileCustomDefinition;
type CustomFieldValue = string | string[] | boolean | number;

const INPUT_TYPES = {
  short_text: 'text',
  date: 'date',
  url: 'url',
  email: 'email',
  phone: 'tel',
} as const;

export type CustomFieldValues = Record<string, CustomFieldValue>;

function textValue(value: CustomFieldValue | undefined): string {
  return searchString(value) ?? '';
}

function numberValue(value: CustomFieldValue | undefined): number | '' {
  if (!Number.isFinite(value)) return '';
  return Number(value);
}

/**
 * One board-defined custom field as an owned control. Values roll up into one
 * `customFieldValues` record keyed by the definition's immutable `key`;
 * select values store option KEYS, never labels — the same contract
 * `resolveCustomFieldDisplay` reads back on the job page. `required` comes
 * from the form layout when there is one (a hidden field is never required),
 * otherwise from the definition. `error` is a message about this field (for
 * example a rule the Board API refused), shown under it.
 */
export function CustomFieldInput({
  definition,
  value,
  required = definition.required,
  onChange,
  error,
}: {
  definition: CustomFieldDefinition;
  value: CustomFieldValue | undefined;
  required?: boolean;
  onChange: (value: CustomFieldValue) => void;
  error?: string | null;
}) {
  const id = `custom-field-${definition.key}`;
  const label = customFieldLabel(definition);
  const invalid = error ? true : undefined;
  const errorText = error ? <FieldError>{error}</FieldError> : null;

  switch (definition.type) {
    case 'short_text':
    case 'date':
    case 'url':
    case 'email':
    case 'phone':
      return (
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            id={id}
            type={INPUT_TYPES[definition.type]}
            required={required}
            aria-invalid={invalid}
            value={textValue(value)}
            onChange={(event) => onChange(event.target.value)}
          />
          {errorText}
        </Field>
      );
    case 'long_text':
      return (
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Textarea
            id={id}
            rows={3}
            required={required}
            aria-invalid={invalid}
            value={textValue(value)}
            onChange={(event) => onChange(event.target.value)}
          />
          {errorText}
        </Field>
      );
    case 'number':
      return (
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            required={required}
            aria-invalid={invalid}
            min={definition.min}
            max={definition.max}
            value={numberValue(value)}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange(
                event.target.value === '' || Number.isNaN(next) ? '' : next,
              );
            }}
          />
          {errorText}
        </Field>
      );
    case 'boolean':
      return (
        <Field
          orientation="horizontal"
          className="w-fit"
          data-invalid={invalid}
        >
          <FieldLabel className="cursor-pointer">
            <Checkbox
              id={id}
              checked={value === true}
              aria-invalid={invalid}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            {label}
          </FieldLabel>
          {errorText}
        </Field>
      );
    case 'single_select':
      return (
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select
            items={(definition.options ?? []).map((option) => ({
              value: option.key,
              label: customFieldOptionLabel(definition.key, option),
            }))}
            required={required}
            value={textValue(value) || null}
            onValueChange={(next) => onChange(searchString(next) ?? '')}
          >
            <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(definition.options ?? []).map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {customFieldOptionLabel(definition.key, option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorText}
        </Field>
      );
    case 'multi_select': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <FieldSet data-invalid={invalid}>
          <FieldLegend variant="label">{label}</FieldLegend>
          <FieldGroup className="flex-row flex-wrap gap-4">
            {(definition.options ?? []).map((option) => {
              const optionId = `${id}-${option.key}`;
              return (
                <Field
                  key={option.key}
                  orientation="horizontal"
                  className="w-auto"
                >
                  <Checkbox
                    id={optionId}
                    checked={selected.includes(option.key)}
                    onCheckedChange={(checked) =>
                      onChange(
                        checked
                          ? [...selected, option.key]
                          : selected.filter((entry) => entry !== option.key),
                      )
                    }
                  />
                  <FieldLabel htmlFor={optionId} className="font-normal">
                    {customFieldOptionLabel(definition.key, option)}
                  </FieldLabel>
                </Field>
              );
            })}
          </FieldGroup>
          {errorText}
        </FieldSet>
      );
    }
    default:
      return null;
  }
}

/** Whether `CustomFieldInput` draws an input for this field type. */
export function hasCustomFieldInput(definition: {
  type: CustomFieldDefinition['type'];
}): boolean {
  return (
    definition.type !== 'rich_text' &&
    definition.type !== 'image_gallery' &&
    definition.type !== 'file'
  );
}

/** An unanswered custom field: nothing typed, nothing ticked, nothing picked. */
export function isCustomFieldEmpty(
  value: CustomFieldValue | undefined | null,
): boolean {
  if (value === undefined || value === null || value === '') return true;
  return Array.isArray(value) && value.length === 0;
}

/**
 * The first required custom field left empty, as a localized message. The
 * platform rejects the write either way; catching it here names the field
 * before the round trip, and covers the pickers (multi-select) that carry no
 * native `required`. A required Yes/No field is never "missing": an
 * untouched one is sent as No.
 */
export function missingRequiredCustomField(
  definitions: readonly CustomFieldDefinition[],
  values: CustomFieldValues,
): string | null {
  const missing = definitions.find(
    (definition) =>
      definition.required &&
      definition.type !== 'boolean' &&
      hasCustomFieldInput(definition) &&
      isCustomFieldEmpty(values[definition.key]),
  );
  return missing
    ? m.jobForm_customFieldRequiredError({ field: customFieldLabel(missing) })
    : null;
}
