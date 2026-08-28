/**
 * Built-in job-form configuration from `board.context().jobForm`.
 *
 * Two kinds of setting live here and they fail differently:
 *
 *   - VISIBILITY hides a field. Absent ⇒ visible (hosted polarity).
 *   - CONSTRAINTS (required / bounds / allow-lists) are ENFORCED by the
 *     platform when the job is created — `collectJobConstraintViolations`
 *     throws `JOBS_CONSTRAINT_VIOLATION`, surfaced as a 400. A form that
 *     ignores them offers options the server will reject and the employer
 *     only finds out on submit, after filling everything in.
 *
 * Absent or pre-4.10 SDK types ⇒ every field visible and unconstrained. The
 * server stays the authority either way, so an over-permissive form
 * degrades to the previous behaviour, whereas an over-strict one would
 * block a legitimate posting outright — every fallback here leans
 * permissive for that reason.
 */

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
  employmentType?: { allowedOptions?: string[] };
};

/**
 * Visibility plus the constraints the platform enforces on write.
 * `null` on an allow-list means "no restriction"; a list is never empty.
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
  employmentType: { allowedOptions: string[] | null };
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
  employmentType: { allowedOptions: null },
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
    employmentType: {
      allowedOptions: allowList(jobForm.employmentType?.allowedOptions),
    },
  };
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
