/**
 * Built-in job-form configuration from `board.context().jobForm`.
 *
 * Two kinds of setting live here and they fail differently:
 *
 *   - VISIBILITY hides a field. Absent ⇒ visible (hosted polarity).
 *   - CONSTRAINTS (required / bounds / allow-lists) are ENFORCED by the
 *     platform when the job is created: it rejects a violating job with a
 *     400. A form that
 *     ignores them offers options the server will reject and the employer
 *     only finds out on submit, after filling everything in.
 *
 * Absent or pre-4.10 SDK types ⇒ every field visible and unconstrained. The
 * server stays the authority either way, so an over-permissive form
 * degrades to the previous behaviour, whereas an over-strict one would
 * block a legitimate posting outright — every fallback here leans
 * permissive for that reason.
 */

import { EMPLOYMENT_TYPES } from '@cavuno/board/filters';

import { enumLabel } from '@/lib/enum-labels';
import { searchString } from '@/lib/pagination';

export type JobFormVisibility = {
  salary: { visible: boolean };
  seniority: { visible: boolean };
  location: { visible: boolean };
  sponsorship: { visible: boolean };
};

type JobFormGroup = {
  salary?: {
    visible?: boolean;
    required?: boolean;
    minBound?: number | null;
    maxBound?: number | null;
    allowedCurrencies?: string[] | null;
  };
  seniority?: {
    visible?: boolean;
    required?: boolean;
    allowedOptions?: string[];
  };
  location?: { visible?: boolean; allowedCountries?: string[] | null };
  sponsorship?: { visible?: boolean };
  workArrangement?: { allowedOptions?: string[] };
  employmentType?: {
    allowedOptions?: string[];
    customTypes?: readonly JobFormCustomEmploymentType[] | null;
    order?: readonly string[] | null;
  };
};

/**
 * A board-defined employment type (e.g. "Casual"). `employmentType` is its
 * built-in Google equivalent; an un-`offered` type still labels the jobs
 * that use it but is never offered to a poster.
 */
export type JobFormCustomEmploymentType = {
  key: string;
  label: string;
  employmentType: string;
  offered: boolean;
};

/**
 * Visibility plus the constraints the platform enforces on write.
 * `null` on an allow-list means "no restriction"; a list is never empty,
 * except `employmentType.allowedOptions` on a board whose offered custom
 * types replace every built-in.
 */
export type JobFormConstraints = JobFormVisibility & {
  salary: {
    visible: boolean;
    required: boolean;
    minBound: number | null;
    maxBound: number | null;
    allowedCurrencies: string[] | null;
  };
  seniority: {
    visible: boolean;
    required: boolean;
    allowedOptions: string[] | null;
  };
  location: { visible: boolean; allowedCountries: string[] | null };
  workArrangement: { allowedOptions: string[] | null };
  employmentType: {
    allowedOptions: string[] | null;
    /** Every custom type, offered or not, in the board's order. */
    customTypes: JobFormCustomEmploymentType[];
    /** Built-in values and custom keys in display order (`[]` = none set). */
    order: string[];
  };
};

/**
 * Board context as far as job-form visibility. `object` is required so this
 * is not a weak type: 4.8.0 `PublicBoard` is assignable (it has `object`,
 * not `jobForm`). A raw `jobForm` group is also assignable.
 */
export type JobFormSource = JobFormGroup & {
  object?: string;
  jobForm?: JobFormGroup | null;
};

const ALL_VISIBLE: JobFormVisibility = {
  salary: { visible: true },
  seniority: { visible: true },
  location: { visible: true },
  sponsorship: { visible: true },
};

const UNCONSTRAINED: JobFormConstraints = {
  salary: {
    visible: true,
    required: false,
    minBound: null,
    maxBound: null,
    allowedCurrencies: null,
  },
  seniority: { visible: true, required: false, allowedOptions: null },
  location: { visible: true, allowedCountries: null },
  sponsorship: { visible: true },
  workArrangement: { allowedOptions: null },
  employmentType: { allowedOptions: null, customTypes: [], order: [] },
};

function visibleFlag(value: { visible?: boolean } | undefined): boolean {
  return value?.visible !== false;
}

/**
 * An allow-list must be non-empty to mean anything. `[]` from a pre-4.10
 * payload would otherwise empty a picker and block every posting, so it
 * reads the same as absent: no restriction.
 */
function allowList(value: string[] | null | undefined): string[] | null {
  return value && value.length > 0 ? value : null;
}

/** Resolve visibility from a public board context (or a raw `jobForm` group). */
export function resolveJobForm(
  source?: JobFormSource | null,
): JobFormVisibility {
  if (source == null) return ALL_VISIBLE;
  const jobForm = source.jobForm ?? source;
  return {
    salary: { visible: visibleFlag(jobForm.salary) },
    seniority: { visible: visibleFlag(jobForm.seniority) },
    location: { visible: visibleFlag(jobForm.location) },
    sponsorship: { visible: visibleFlag(jobForm.sponsorship) },
  };
}

/** Resolve visibility AND the server-enforced constraints. */
export function resolveJobFormConstraints(
  source?: JobFormSource | null,
): JobFormConstraints {
  if (source == null) return UNCONSTRAINED;
  const jobForm = source.jobForm ?? source;
  const salaryRequired = jobForm.salary?.required === true;
  return {
    salary: {
      visible: visibleFlag(jobForm.salary),
      required: salaryRequired,
      // The API already drops bounds on an optional salary (a floor is
      // toothless there); re-assert it so no payload can make this form
      // enforce a bound the server will not.
      minBound: salaryRequired ? (jobForm.salary?.minBound ?? null) : null,
      maxBound: salaryRequired ? (jobForm.salary?.maxBound ?? null) : null,
      allowedCurrencies: allowList(jobForm.salary?.allowedCurrencies),
    },
    seniority: {
      visible: visibleFlag(jobForm.seniority),
      required: jobForm.seniority?.required === true,
      allowedOptions: allowList(jobForm.seniority?.allowedOptions),
    },
    location: {
      visible: visibleFlag(jobForm.location),
      allowedCountries: allowList(jobForm.location?.allowedCountries),
    },
    sponsorship: { visible: visibleFlag(jobForm.sponsorship) },
    workArrangement: {
      allowedOptions: allowList(jobForm.workArrangement?.allowedOptions),
    },
    employmentType: resolveEmploymentTypeConstraints(jobForm.employmentType),
  };
}

function resolveEmploymentTypeConstraints(
  group: JobFormGroup['employmentType'],
): JobFormConstraints['employmentType'] {
  const customTypes = group?.customTypes ?? [];
  // An empty built-in list means "only custom types" when the board offers
  // some; otherwise it reads as no restriction, like every other allow-list.
  const allowedOptions =
    group?.allowedOptions?.length === 0 &&
    customTypes.some((type) => type.offered)
      ? []
      : allowList(group?.allowedOptions);
  return {
    allowedOptions,
    customTypes: customTypes.map(({ key, label, employmentType, offered }) => ({
      key,
      label,
      employmentType,
      offered,
    })),
    order: [...(group?.order ?? [])],
  };
}

/**
 * The job search's employment-type filter options: the board's offered
 * built-ins within the listing filter vocabulary plus its offered custom
 * types, in the board's order.
 */
export function employmentTypeFilterChoices(
  source?: JobFormSource | null,
): EmploymentTypeChoice[] {
  return employmentTypeChoices(
    resolveJobFormConstraints(source).employmentType,
    EMPLOYMENT_TYPES,
  ).choices;
}

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

/**
 * Narrow a form's own option list to the board's allow-list, preserving the
 * form's order. `null` (no restriction) and a list that overlaps nothing
 * both leave the list untouched: an empty picker blocks every posting,
 * while an over-permissive one just defers to the server's 400.
 */
export function narrowOptions<T extends string>(
  all: readonly T[],
  allowed: readonly string[] | null,
): T[] {
  if (!allowed) return [...all];
  const permitted = all.filter((value) => allowed.includes(value));
  return permitted.length > 0 ? permitted : [...all];
}

/**
 * One broken Job form rule, as a `jobs_constraint_violation` error lists it
 * in `details.violations`. `code` is the platform's stable rule code (e.g.
 * `custom_field_required`, `salary_required`); `path` names the field
 * (`["customFieldValues", "<key>"]` for a custom field); `params` carries the
 * values the message interpolates.
 */
export type JobFormViolation = {
  code: string;
  path: string[];
  params?: {
    label?: string;
    min?: string;
    max?: string;
    countries?: string;
  };
};

/** The documented `details` of a `jobs_constraint_violation`, before checks. */
type ViolationDetails = {
  violations?: ReadonlyArray<{
    code?: string;
    path?: ReadonlyArray<string | number>;
    params?: JobFormViolation['params'];
  } | null>;
};

/**
 * Read the violations off a Board API error's `details`. Anything that does
 * not match the documented shape is dropped: an unreadable detail falls back
 * to the error's code, never to a crash.
 */
export function parseJobFormViolations<T>(details: T): JobFormViolation[] {
  if (details === null || details === undefined || Object(details) !== details)
    return [];
  // SAFETY: Board API error details are object records; a
  // `jobs_constraint_violation` documents `violations` as `{ code, path,
  // params }` entries, and every field read below is re-checked before use.
  const { violations } = details as ViolationDetails;
  if (!Array.isArray(violations)) return [];
  return violations.flatMap((entry): JobFormViolation[] => {
    const code = searchString(entry?.code);
    const path = entry?.path;
    if (!code || !Array.isArray(path)) return [];
    const violation: JobFormViolation = {
      code,
      path: path.map((segment) => String(segment)),
    };
    const params = entry?.params;
    if (params) {
      violation.params = {
        label: searchString(params.label),
        min: searchString(params.min),
        max: searchString(params.max),
        countries: searchString(params.countries),
      };
    }
    return [violation];
  });
}
