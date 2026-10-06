/**
 * A board's employment-type picker: the offered built-ins and custom types
 * (e.g. "Casual") in the board's order. Only the job forms and the search
 * filter load it; `job-form` itself rides every page through the job card
 * view model, so the picker logic lives apart.
 */

import type { JobFormConstraints } from '@/board/job-form';
import { enumLabel } from '@/lib/enum-labels';

/** Prefix marking a custom employment type key in a picker value. */
export const CUSTOM_EMPLOYMENT_TYPE_PREFIX = 'custom:';

/** Every built-in employment type on the wire. */
const BUILTIN_EMPLOYMENT_TYPES: readonly string[] = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
  'volunteer',
  'other',
];

/**
 * The built-ins a form offers when the board context predates allow-lists
 * (the posting picker's long-standing set).
 */
const DEFAULT_EMPLOYMENT_TYPES: readonly string[] = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
];

/** A board's employment-type picker: its choices, and the pinned one. */
export type EmploymentTypeChoices = {
  choices: EmploymentTypeChoice[];
  /** The only choice when there is exactly one (the field collapses). */
  pinned: EmploymentTypeChoice | null;
};

/** One option of an employment-type picker or filter. */
export type EmploymentTypeChoice = {
  /** The built-in value, or `custom:<key>` for a custom type. */
  value: string;
  /** The built-in sent as `employmentType` (a custom type's equivalent). */
  employmentType: string;
  /** The custom type key sent as `customEmploymentType`, or `null`. */
  customEmploymentType: string | null;
  label: string;
};

/** The picker value for a job's stored employment type. */
export function employmentTypeChoiceValue(job: {
  employmentType?: string | null;
  customEmploymentType?: { key: string } | null;
}): string | null {
  if (job.customEmploymentType) {
    return `${CUSTOM_EMPLOYMENT_TYPE_PREFIX}${job.customEmploymentType.key}`;
  }
  return job.employmentType ?? null;
}

/**
 * The employment types a board offers, in its display order: the offered
 * built-ins (within `vocabulary`) interleaved with the offered custom types
 * by `order`. `pinned` is the only choice when there is exactly one: the
 * form collapses the field and submits that value.
 *
 * Leans permissive like `narrowOptions`: when nothing at all would be
 * offered, the vocabulary's defaults are, and the server stays the judge.
 */
export function employmentTypeChoices(
  employmentType: JobFormConstraints['employmentType'],
  vocabulary: readonly string[] = BUILTIN_EMPLOYMENT_TYPES,
): EmploymentTypeChoices {
  const inVocabulary = (values: readonly string[]) =>
    values.filter((value) => vocabulary.includes(value));
  const offeredCustom = employmentType.customTypes.filter(
    (type) => type.offered,
  );
  let builtins = inVocabulary(
    employmentType.allowedOptions ?? DEFAULT_EMPLOYMENT_TYPES,
  );
  if (builtins.length === 0 && offeredCustom.length === 0) {
    builtins = inVocabulary(DEFAULT_EMPLOYMENT_TYPES);
  }
  const ranked = [
    ...builtins.map((value): EmploymentTypeChoice & { id: string } => ({
      id: value,
      value,
      employmentType: value,
      customEmploymentType: null,
      label: enumLabel(value) ?? value,
    })),
    ...offeredCustom.map((type): EmploymentTypeChoice & { id: string } => ({
      id: type.key,
      value: `${CUSTOM_EMPLOYMENT_TYPE_PREFIX}${type.key}`,
      employmentType: type.employmentType,
      customEmploymentType: type.key,
      label: type.label,
    })),
  ];
  const rank = new Map(employmentType.order.map((id, index) => [id, index]));
  const unranked = employmentType.order.length;
  const choices = ranked
    .map((choice, index) => ({ choice, index }))
    .sort(
      (a, b) =>
        (rank.get(a.choice.id) ?? unranked + a.index) -
        (rank.get(b.choice.id) ?? unranked + b.index),
    )
    .map(({ choice: { id: _id, ...choice } }) => choice);
  return { choices, pinned: choices.length === 1 ? choices[0]! : null };
}
