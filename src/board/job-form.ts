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

const ALL_VISIBLE: JobFormVisibility = {
  salary: { visible: true },
  seniority: { visible: true },
  location: { visible: true },
  sponsorship: { visible: true },
};

function visibleFlag(value: { visible?: boolean } | undefined): boolean {
  return value?.visible !== false;
}

function asJobForm(value: unknown): JobFormVisibility | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  return value as JobFormVisibility;
}

/** Resolve visibility from a public board context (or a raw `jobForm` group). */
export function resolveJobForm(source: unknown): JobFormVisibility {
  if (source === null || source === undefined) return ALL_VISIBLE;
  if (typeof source !== 'object') return ALL_VISIBLE;
  const record = source as { jobForm?: unknown };
  const jobForm =
    'jobForm' in record ? asJobForm(record.jobForm) : asJobForm(source);
  if (!jobForm) return ALL_VISIBLE;
  return {
    salary: { visible: visibleFlag(jobForm.salary) },
    seniority: { visible: visibleFlag(jobForm.seniority) },
    location: { visible: visibleFlag(jobForm.location) },
    sponsorship: { visible: visibleFlag(jobForm.sponsorship) },
  };
}
