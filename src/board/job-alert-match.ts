import type { JobAlertAnchorJob, JobAlertKind } from '@cavuno/board';

/**
 * What a stored job alert matches, for alert lists (`/me/alerts` and the
 * token-based manage page). Both lanes return the same `kind`, `anchorJob`
 * and `filters.query`/`jobFunctions`, so one mapping serves both.
 */
export type JobAlertMatch =
  /** Jobs similar to the job the alert was subscribed from. */
  | { kind: 'similar_job'; anchorJob: { slug: string | null; title: string } }
  /**
   * A board search for the alert's `query`. An older search alert has no
   * `query` and keeps its keyword as its job functions (`query` is null).
   */
  | { kind: 'search'; query: string | null; jobFunctions: string[] }
  /** Exact stored filters; the caller renders its own filter labels. */
  | { kind: 'filters' };

/** At most one alert list's worth of anchor jobs are resolved to links. */
export const MAX_ANCHOR_JOB_LINKS = 10;

export interface JobAlertMatchSource {
  kind: JobAlertKind;
  anchorJob: JobAlertAnchorJob;
  filters: { query?: string | null; jobFunctions?: string[] };
}

export function jobAlertMatch(alert: JobAlertMatchSource): JobAlertMatch {
  if (alert.kind === 'similar_job' && alert.anchorJob) {
    return {
      kind: 'similar_job',
      anchorJob: { slug: alert.anchorJob.slug, title: alert.anchorJob.title },
    };
  }
  if (alert.kind === 'search') {
    const query = alert.filters.query?.trim() || null;
    const jobFunctions = alert.filters.jobFunctions ?? [];
    if (query || jobFunctions.length) {
      return { kind: 'search', query, jobFunctions };
    }
  }
  // Includes a similar-job alert whose anchor job was never captured: its
  // stored filters are all there is to show.
  return { kind: 'filters' };
}

/** Anchor job slugs to resolve to job links, deduped and bounded. */
export function anchorJobSlugs(alerts: readonly JobAlertMatchSource[]) {
  const slugs = new Set<string>();
  for (const alert of alerts) {
    const match = jobAlertMatch(alert);
    if (match.kind === 'similar_job' && match.anchorJob.slug) {
      slugs.add(match.anchorJob.slug);
    }
  }
  return [...slugs].slice(0, MAX_ANCHOR_JOB_LINKS);
}

/** Job slug → job detail path, for the anchor jobs that still resolve. */
export type AnchorJobPaths = Record<string, string>;
