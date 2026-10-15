import { m } from '../paraglide/messages';

import type { JobAlertAnchorJob, JobAlertKind } from '@cavuno/board';

/** The Board API caps an alert's search keywords at 200 characters. */
export const ALERT_QUERY_MAX_LENGTH = 200;

/**
 * What a stored job alert matches, for alert lists (`/me/alerts` and the
 * token-based manage page). Both lanes return the same `kind`, `anchorJob`
 * and `filters.query`/`jobFunctions`, so one mapping serves both.
 */
export type JobAlertMatch =
  /**
   * Jobs similar to the job the alert was subscribed from. `anchorJob` is
   * null when the board never captured it; the alert is delete-only either
   * way.
   */
  | { kind: 'similar_job'; anchorJob: JobAlertAnchorJob }
  /**
   * A board search for `keywords` (`search`) or the exact stored filters
   * (`filters`). `roles` are job functions that filter alongside them; an
   * older search alert's keyword job function is not one.
   */
  | {
      kind: Exclude<JobAlertKind, 'similar_job'>;
      keywords: string | null;
      roles: string[];
    };

export type JobAlertSearchMatch = Exclude<
  JobAlertMatch,
  { kind: 'similar_job' }
>;

export interface JobAlertMatchSource {
  kind: JobAlertKind;
  anchorJob: JobAlertAnchorJob;
  filters: { query?: string | null; jobFunctions?: string[] };
}

/**
 * A job-function slug from free text, the way the board slugs them in
 * English: lowercase ASCII words joined by hyphens, with `&`, `+`, `#` and
 * `.` spelled out so `C++` and `C#` stay apart. Only used to recognise a
 * keyword the board stored as a job function; a text it slugs differently
 * (a non-Latin script) simply stays a role.
 */
export function taxonomySlug(text: string): string {
  return text
    .replace(/([\s\-_])&([\s\-_])/g, '$1and$2')
    .replace(/&/g, '-and-')
    .replace(/\+\+/g, '-plus-plus')
    .replace(/#/g, '-sharp')
    .replace(/\+/g, '-plus')
    .replace(/\./g, '-dot-')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/['"]+/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Whether a search alert's single job function is its keyword rather than a
 * role filter, as the board decides it: an older search alert kept its
 * keyword as its only job function (no stored query), and a keyword the
 * board captured from a search page is stored as the query and its slug.
 */
export function jobFunctionIsKeyword(alert: JobAlertMatchSource): boolean {
  const functions = alert.filters.jobFunctions ?? [];
  if (alert.kind !== 'search' || functions.length !== 1) return false;
  const query = alert.filters.query?.trim();
  return !query || taxonomySlug(query) === functions[0];
}

export function jobAlertMatch(alert: JobAlertMatchSource): JobAlertMatch {
  if (alert.kind === 'similar_job') {
    return { kind: 'similar_job', anchorJob: alert.anchorJob };
  }
  const jobFunctions = alert.filters.jobFunctions ?? [];
  const query = alert.filters.query?.trim() || null;
  if (jobFunctionIsKeyword(alert)) {
    // An older alert's keyword is a slug; the board searches it as words.
    return {
      kind: alert.kind,
      keywords: query ?? jobFunctions[0]!.replaceAll('-', ' '),
      roles: [],
    };
  }
  return { kind: alert.kind, keywords: query, roles: jobFunctions };
}

/**
 * The leading "what it matches" text of a search or filter alert row: its
 * quoted keywords and the roles it filters on. Null when it has neither, so
 * the caller shows its own "any job" wording.
 */
export function searchKeywordsText(match: JobAlertSearchMatch): string | null {
  const parts = [
    ...(match.keywords
      ? [m.jobAlertMatch_quotedQuery({ query: match.keywords })]
      : []),
    ...match.roles,
  ];
  return parts.length ? parts.join(', ') : null;
}

/** Job slug → job detail path, for the anchor jobs that still resolve. */
export type AnchorJobPaths = Record<string, string>;

/**
 * Job links for the alerts' similar-job anchor jobs. Display only: if they
 * can't be read, the job titles show unlinked. The server function dedupes
 * and bounds the slugs.
 */
export async function resolveAnchorJobPaths(
  alerts: readonly JobAlertMatchSource[],
  getAnchorJobPaths: (options: {
    data: { jobSlugs: string[] };
  }) => Promise<AnchorJobPaths>,
): Promise<AnchorJobPaths> {
  const jobSlugs = alerts.flatMap((alert) =>
    alert.kind === 'similar_job' && alert.anchorJob?.slug
      ? [alert.anchorJob.slug]
      : [],
  );
  if (!jobSlugs.length) return {};
  return getAnchorJobPaths({ data: { jobSlugs } }).catch(() => ({}));
}
