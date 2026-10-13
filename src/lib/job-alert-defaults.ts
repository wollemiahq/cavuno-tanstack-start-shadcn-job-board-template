import type {
  JobAlertFiltersInput,
  JobAlertRemoteOption,
  PublicJob,
} from '@cavuno/board';

const MAX_JOB_FUNCTIONS = 8;
const REMOTE_OPTIONS = ['on_site', 'hybrid', 'remote'] as const;

export interface JobAlertDefaults {
  /** Heading hint (job title / keyword) — display only. */
  label?: string;
  filters: JobAlertFiltersInput;
  context: { source: string; jobId?: string; jobSlug?: string };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function toRemoteOptions(
  value: string | null,
): JobAlertRemoteOption[] | undefined {
  const option = REMOTE_OPTIONS.find((remoteOption) => remoteOption === value);
  return option ? [option] : undefined;
}

/**
 * Scope a job-detail alert to "more jobs like this one". `jobFunctions` uses the
 * category/skill *slugs*: the digest matcher compares them against each job's
 * canonical category and skill slugs, so display names would never match.
 * `placeSlugs` uses the deepest (most specific) place in the hierarchy.
 */
export function jobAlertDefaultsFromJob(job: PublicJob): JobAlertDefaults {
  const jobFunctions = dedupe([
    ...job.categories.map((category) => category.slug),
    ...job.skills.map((skill) => skill.slug),
  ]).slice(0, MAX_JOB_FUNCTIONS);
  const placeSlug = job.placeHierarchy.at(-1)?.slug;

  return {
    label: job.title,
    filters: {
      jobFunctions: jobFunctions.length ? jobFunctions : undefined,
      seniorityLevels: job.seniority ? [job.seniority] : undefined,
      remoteOptions: toRemoteOptions(job.remoteOption),
      placeSlugs: placeSlug ? [placeSlug] : undefined,
    },
    context: {
      source: 'job_detail',
      jobId: job.id,
      jobSlug: job.slug ?? undefined,
    },
  };
}

/**
 * Scope a listing/search alert (the hosted `createJobAlertDefaultsFromFilters`):
 * the keyword becomes the job function and the active location slug the place.
 * The keyword is sent as typed: the platform canonicalizes free-text job
 * functions to taxonomy slugs, so the starter does not slugify it locally.
 */
export function jobAlertDefaultsFromSearch(opts: {
  keyword?: string;
  locationSlug?: string;
  source?: string;
}): JobAlertDefaults {
  const jobFunction = opts.keyword?.trim() ?? '';
  return {
    label: opts.keyword,
    filters: {
      jobFunctions: jobFunction ? [jobFunction] : undefined,
      placeSlugs: opts.locationSlug ? [opts.locationSlug] : undefined,
    },
    context: { source: opts.source ?? 'jobs_list' },
  };
}
