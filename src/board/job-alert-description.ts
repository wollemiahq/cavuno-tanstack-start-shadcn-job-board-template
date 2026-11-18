import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import {
  jobAlertMatch,
  type AlertFilterNames,
  type DescribableJobAlert,
} from './job-alert-match';

import { enumLabel } from '@/lib/enum-labels';

// Apart from job-alert-match so the eager alerts loader, which imports that
// module, does not pull this page-only text into the shared shell.

function salaryText({
  salaryMin,
  salaryMax,
  salaryCurrency,
}: DescribableJobAlert['filters']): string | null {
  if (!salaryCurrency) return null;
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency: salaryCurrency,
      notation: 'compact',
      maximumFractionDigits: 1,
    });
  } catch {
    // A stored currency that isn't a currency code: leave the salary out
    // rather than fail the page.
    return null;
  }
  if (salaryMin != null && salaryMax != null)
    return m.jobAlertMatch_salaryRange({
      min: format.format(salaryMin),
      max: format.format(salaryMax),
    });
  if (salaryMin != null)
    return m.jobAlertMatch_salaryFrom({ amount: format.format(salaryMin) });
  if (salaryMax != null)
    return m.jobAlertMatch_salaryUpTo({ amount: format.format(salaryMax) });
  return null;
}

/**
 * The alert's places by name. The board names only places its live jobs
 * use, so the rest are counted rather than dropped: an alert scoped to a
 * place never reads as matching everywhere.
 */
function placesText(
  placeIds: readonly string[],
  placeNames: Record<string, string>,
): string | null {
  const ids = [...new Set(placeIds)];
  const named = ids.flatMap((id) => placeNames[id] ?? []);
  const unnamed = ids.length - named.length;
  if (unnamed === 0) return named.length ? named.join(', ') : null;
  return named.length
    ? `${named.join(', ')}, ${m.jobAlertMatch_morePlaces({ count: unnamed })}`
    : m.jobAlertMatch_places({ count: unnamed });
}

/** An alert's headline (null: name its anchor job) and its other filters. */
export type JobAlertDescription = {
  headline: string | null;
  criteria: string[];
};

/**
 * A search or filter alert in words, so a person can tell their alerts
 * apart: a headline (its name, else its keywords, else its categories) and
 * the rest of what it matches, or that nothing else narrows it. A
 * similar-job alert is described by its anchor job (`AnchorJobTitle`)
 * unless it has a name, with no criteria.
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
    placesText(filters.placeIds ?? [], names.places),
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
  // Only a keyword or category narrows it: say so, rather than leave the
  // line under the headline empty.
  return {
    headline,
    criteria: criteria.length ? criteria : [m.jobAlertMatch_anyCriteria()],
  };
}
