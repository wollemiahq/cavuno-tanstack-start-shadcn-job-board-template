'use client';

import {
  customFieldLabel,
  customFieldOptionLabel,
} from '@/board/custom-field-labels';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
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

type CustomFieldDefinition = PublicBoard['customFields']['job'][number];
type CustomFieldValue = string | string[] | boolean | number;

export type CustomFieldValues = Record<string, CustomFieldValue>;

function textValue(value: CustomFieldValue | undefined): string {
  return searchString(value) ?? '';
}

function numberValue(value: CustomFieldValue | undefined): number | '' {
  if (!Number.isFinite(value)) return '';
  return Number(value);
}

/**
 * Board-defined custom fields for the public posting form. They render as
 * their own group after the built-in fields, in operator-config
 * order). Uncontrolled per-field values roll up into one `customFieldValues`
 * record keyed by the definition's immutable `key`; select values store
 * option KEYS, never labels — the same contract `resolveCustomFieldDisplay`
 * reads back on the job page.
 */
export function CustomFieldsGroup({
  definitions,
  values,
  onChange,
}: {
  definitions: CustomFieldDefinition[];
  values: CustomFieldValues;
  onChange: (values: CustomFieldValues) => void;
}) {
  if (definitions.length === 0) return null;

  const set = (key: string, value: string | string[] | boolean | number) =>
    onChange({ ...values, [key]: value });

  return (
    <>
      {definitions.map((definition) => {
        const id = `custom-field-${definition.key}`;
        const value = values[definition.key];

        switch (definition.type) {
          case 'short_text':
            return (
              <Field key={definition.key}>
                <FieldLabel htmlFor={id}>
                  {customFieldLabel(definition)}
                </FieldLabel>
                <Input
                  id={id}
                  required={definition.required}
                  value={textValue(value)}
                  onChange={(event) => set(definition.key, event.target.value)}
                />
              </Field>
            );
          case 'long_text':
            return (
              <Field key={definition.key}>
                <FieldLabel htmlFor={id}>
                  {customFieldLabel(definition)}
                </FieldLabel>
                <Textarea
                  id={id}
                  rows={3}
                  required={definition.required}
                  value={textValue(value)}
                  onChange={(event) => set(definition.key, event.target.value)}
                />
              </Field>
            );
          case 'number':
            return (
              <Field key={definition.key}>
                <FieldLabel htmlFor={id}>
                  {customFieldLabel(definition)}
                </FieldLabel>
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  required={definition.required}
                  min={definition.min}
                  max={definition.max}
                  value={numberValue(value)}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    set(
                      definition.key,
                      event.target.value === '' || Number.isNaN(next)
                        ? ''
                        : next,
                    );
                  }}
                />
              </Field>
            );
          case 'boolean':
            return (
              <Field
                key={definition.key}
                orientation="horizontal"
                className="w-fit"
              >
                <FieldLabel className="cursor-pointer">
                  <Checkbox
                    id={id}
                    checked={value === true}
                    onCheckedChange={(checked) =>
                      set(definition.key, checked === true)
                    }
                  />
                  {customFieldLabel(definition)}
                </FieldLabel>
              </Field>
            );
          case 'single_select':
            return (
              <Field key={definition.key}>
                <FieldLabel htmlFor={id}>
                  {customFieldLabel(definition)}
                </FieldLabel>
                <Select
                  items={(definition.options ?? []).map((option) => ({
                    value: option.key,
                    label: customFieldOptionLabel(definition.key, option),
                  }))}
                  required={definition.required}
                  value={textValue(value) || null}
                  onValueChange={(next) =>
                    set(definition.key, searchString(next) ?? '')
                  }
                >
                  <SelectTrigger id={id} className="w-full">
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
              </Field>
            );
          case 'multi_select': {
            const selected = Array.isArray(value) ? value : [];
            return (
              <FieldSet key={definition.key}>
                <FieldLegend variant="label">
                  {customFieldLabel(definition)}
                </FieldLegend>
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
                            set(
                              definition.key,
                              checked
                                ? [...selected, option.key]
                                : selected.filter(
                                    (entry) => entry !== option.key,
                                  ),
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
              </FieldSet>
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}
