/**
 * Built-in job-form field visibility from `board.context().jobForm`.
 * Absent or pre-4.9 SDK types ⇒ every field visible (hosted polarity).
 */

export type JobFormVisibility = {
  salary: { visible: boolean };
  seniority: { visible: boolean };
  location: { visible: boolean };
  sponsorship: { visible: boolean };
};

type JobFormGroup = {
  salary?: { visible?: boolean };
  seniority?: { visible?: boolean };
  location?: { visible?: boolean };
  sponsorship?: { visible?: boolean };
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

function visibleFlag(value: { visible?: boolean } | undefined): boolean {
  return value?.visible !== false;
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
