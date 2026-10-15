import type {
  JobAlertFiltersInput,
  JobAlertRemoteOption,
  PublicJob,
} from '@cavuno/board';

/** The Board API caps an alert's search keywords at 200 characters. */
const MAX_QUERY_LENGTH = 200;
const REMOTE_OPTIONS = ['on_site', 'hybrid', 'remote'] as const;

export interface JobAlertDefaults {
  /** Heading hint (job title / keyword) — display only. */
  label?: string;
  filters: JobAlertFiltersInput;
  context: { source: string; jobId?: string; jobSlug?: string };
}

function toRemoteOptions(
  value: string | null,
): JobAlertRemoteOption[] | undefined {
  const option = REMOTE_OPTIONS.find((remoteOption) => remoteOption === value);
  return option ? [option] : undefined;
}

/**
 * Scope a job-detail alert to "more jobs like this one". The `job_detail`
 * source plus `jobId` makes it a similar-job alert anchored on this job, so it
 * sends no keywords or job functions: the anchor job decides what matches.
 * `placeSlugs` (the deepest place in the hierarchy) keeps it near the job.
 */
export function jobAlertDefaultsFromJob(job: PublicJob): JobAlertDefaults {
  const placeSlug = job.placeHierarchy.at(-1)?.slug;

  return {
    label: job.title,
    filters: {
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
 * Scope a listing/search alert: the text query the page ran becomes the
 * alert's search `query`, and the active location slug its place. A blank
 * query leaves a location-only (or all-jobs) alert.
 */
export function jobAlertDefaultsFromSearch(opts: {
  query?: string;
  locationSlug?: string;
  source?: string;
}): JobAlertDefaults {
  const query =
    opts.query?.trim().slice(0, MAX_QUERY_LENGTH).trim() || undefined;
  return {
    label: query,
    filters: {
      query,
      placeSlugs: opts.locationSlug ? [opts.locationSlug] : undefined,
    },
    context: { source: opts.source ?? 'jobs_list' },
  };
}
