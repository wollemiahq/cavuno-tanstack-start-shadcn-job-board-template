import type { JobAlertFiltersInput, JobAlertRemoteOption, PublicJob } from '@cavuno/board'

const MAX_JOB_FUNCTIONS = 8
const REMOTE_OPTIONS: readonly string[] = ['on_site', 'hybrid', 'remote']

export interface JobAlertDefaults {
  /** Heading hint (job title / keyword) — display only. */
  label?: string
  filters: JobAlertFiltersInput
  context: { source: string; jobId?: string; jobSlug?: string }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))]
}

function toRemoteOptions(value: string | null): JobAlertRemoteOption[] | undefined {
  return value && REMOTE_OPTIONS.includes(value)
    ? [value as JobAlertRemoteOption]
    : undefined
}

/**
 * Scope a job-detail alert to "more jobs like this one". `jobFunctions` uses the
 * category/skill *names* — the digest matcher compares them against the job
 * doc's stored category strings (which are the source names). `placeSlugs` uses
 * the deepest (most specific) place in the hierarchy.
 */
export function jobAlertDefaultsFromJob(job: PublicJob): JobAlertDefaults {
  const jobFunctions = dedupe([
    ...job.categories.map((category) => category.name),
    ...job.skills.map((skill) => skill.name),
  ]).slice(0, MAX_JOB_FUNCTIONS)
  const placeSlug = job.placeHierarchy.at(-1)?.slug

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
  }
}

/**
 * Scope a listing/search alert (the hosted `createJobAlertDefaultsFromFilters`):
 * the keyword becomes the job function and the active location slug the place.
 */
export function jobAlertDefaultsFromSearch(opts: {
  keyword?: string
  locationSlug?: string
  source?: string
}): JobAlertDefaults {
  return {
    label: opts.keyword,
    filters: {
      jobFunctions: opts.keyword ? [opts.keyword] : undefined,
      placeSlugs: opts.locationSlug ? [opts.locationSlug] : undefined,
    },
    context: { source: opts.source ?? 'jobs_list' },
  }
}
