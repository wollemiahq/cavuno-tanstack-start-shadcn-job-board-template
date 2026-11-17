import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import { enumLabel } from '@/lib/enum-labels';
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

/** Category slug → name and place id → name, for describing alerts. */
export type AlertFilterNames = {
  categories: Record<string, string>;
  places: Record<string, string>;
};

/** An alert as both alert lists have it, with every stored filter. */
export interface DescribableJobAlert extends JobAlertMatchSource {
  label: string | null;
  filters: JobAlertMatchSource['filters'] & {
    seniorityLevels?: string[];
    remoteOptions?: string[];
    placeIds?: string[];
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency?: string | null;
  };
}

function salaryText({
  salaryMin,
  salaryMax,
  salaryCurrency,
}: DescribableJobAlert['filters']): string | null {
  if (!salaryCurrency || (salaryMin == null && salaryMax == null)) return null;
  const money = (amount: number) =>
    new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency: salaryCurrency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  if (salaryMin != null && salaryMax != null)
    return m.jobAlertMatch_salaryRange({
      min: money(salaryMin),
      max: money(salaryMax),
    });
  return salaryMin != null
    ? m.jobAlertMatch_salaryFrom({ amount: money(salaryMin) })
    : m.jobAlertMatch_salaryUpTo({ amount: money(salaryMax!) });
}

/** An alert's headline (null: name its anchor job) and its other filters. */
export type JobAlertDescription = {
  headline: string | null;
  criteria: string[];
};

/**
 * A search or filter alert in words, so a person can tell their alerts
 * apart: a headline (its name, else its keywords, else its categories) and
 * the rest of what it matches. A similar-job alert is described by its
 * anchor job (`AnchorJobTitle`) unless it has a name.
 */
export function describeJobAlert(
  alert: DescribableJobAlert,
  names: AlertFilterNames,
): JobAlertDescription {
  const match = jobAlertMatch(alert);
  if (match.kind === 'similar_job') {
    return { headline: alert.label, criteria: [] };
  }
  const list = (values: string[]) => (values.length ? values.join(', ') : null);
  // A category the board no longer resolves still reads as words.
  const roleNames = match.roles.map(
    (slug) => names.categories[slug] ?? slug.replaceAll('-', ' '),
  );
  const roles = list(roleNames);
  // A title stays short: two categories, then how many more.
  const rolesTitle =
    roleNames.length > 2
      ? m.jobAlertMatch_jobsInMore({
          categories: roleNames.slice(0, 2).join(', '),
          count: roleNames.length - 2,
        })
      : roles
        ? m.jobAlertMatch_jobsIn({ categories: roles })
        : null;
  const keywords = match.keywords
    ? m.jobAlertMatch_quotedQuery({ query: match.keywords })
    : null;
  const headline =
    alert.label ??
    (match.keywords
      ? m.jobAlertMatch_jobsMatching({ query: match.keywords })
      : (rolesTitle ?? m.alertsManage_allJobsText()));
  const { filters } = alert;
  const criteria = [
    alert.label ? keywords : null,
    alert.label || match.keywords ? roles : null,
    list((filters.placeIds ?? []).flatMap((id) => names.places[id] ?? [])),
    list(
      (filters.remoteOptions ?? []).map(
        (option) => enumLabel(option) ?? option.replaceAll('_', ' '),
      ),
    ),
    list(
      (filters.seniorityLevels ?? []).map(
        (level) => enumLabel(level) ?? level.replaceAll('_', ' '),
      ),
    ),
    salaryText(filters),
  ].filter((part): part is string => part !== null);
  return { headline, criteria };
}

/**
 * Names for the alerts' categories and places. Display only: if they can't
 * be read, the alerts show category slugs as words and leave places out.
 */
export async function resolveAlertFilterNames(
  alerts: readonly DescribableJobAlert[],
  getAlertFilterNames: (options: {
    data: { categorySlugs: string[]; placeIds: string[] };
  }) => Promise<AlertFilterNames>,
): Promise<AlertFilterNames> {
  const categorySlugs = alerts.flatMap((alert) => {
    const match = jobAlertMatch(alert);
    return match.kind === 'similar_job' ? [] : match.roles;
  });
  const placeIds = alerts.flatMap((alert) => alert.filters.placeIds ?? []);
  const none = { categories: {}, places: {} };
  if (!categorySlugs.length && !placeIds.length) return none;
  return getAlertFilterNames({ data: { categorySlugs, placeIds } }).catch(
    () => none,
  );
}
