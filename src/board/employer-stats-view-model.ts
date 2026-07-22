import { formatDate } from '@cavuno/board/format';

import type {
  EmployerJobStat,
  EmployerJobStatsPoint,
  EmployerProfileViewsPoint,
} from '@cavuno/board';

/**
 * Employer job-stats VIEW-MODEL — the Layer-1b seam for the reporting funnel
 * on the company workspace (`board.me.companies.jobStats.*`). This is the ONLY
 * place the raw stat wire types, the SDK date formatter, and the number/locale
 * formatting touch the board. It hands the table + chart plain, fully-resolved
 * data so the presentational layer stays dumb.
 *
 * Two honesty rules the mappers encode so a redesign can't lose them:
 *   • `applications === null` is an EXTERNAL-APPLY job (no native pipeline) — it
 *     renders the not-applicable dash, never `0`.
 *   • a job with NO stats row (a draft, or the whole read degrading to empty)
 *     renders the dash across all three metrics, never `0`.
 */

/** The not-applicable / no-data glyph shared by every empty stat cell. */
export const STAT_PLACEHOLDER = '—';

/** One job's three resolved stat cells (already number-formatted or dashed). */
export interface EmployerJobStatCellsVM {
  views: string;
  applyClicks: string;
  applications: string;
  /**
   * `true` when the job has NO native application count — an external-apply
   * job (`applications: null`) or a job with no stats row at all. The cell
   * shows the dash; this flag lets a component add an accessible label.
   */
  applicationsNotApplicable: boolean;
}

/**
 * Index the per-job stats envelope by `jobId` for an O(1) per-row join. A
 * draft (or any job the endpoint omits) simply isn't in the map.
 */
export function toEmployerJobStatsIndex(
  stats: readonly EmployerJobStat[],
): Map<string, EmployerJobStat> {
  return new Map(stats.map((stat) => [stat.jobId, stat]));
}

/**
 * Resolve one job's stat cells. `stat` is `undefined` for a draft, or when the
 * whole stats read degraded — both render the dash across the board.
 */
export function toEmployerJobStatCellsVM(
  stat: EmployerJobStat | undefined,
  language: string,
): EmployerJobStatCellsVM {
  if (!stat) {
    return {
      views: STAT_PLACEHOLDER,
      applyClicks: STAT_PLACEHOLDER,
      applications: STAT_PLACEHOLDER,
      applicationsNotApplicable: true,
    };
  }
  const applicationsNotApplicable = stat.applications === null;
  return {
    views: stat.views.toLocaleString(language),
    applyClicks: stat.applyClicks.toLocaleString(language),
    applications: applicationsNotApplicable
      ? STAT_PLACEHOLDER
      : (stat.applications as number).toLocaleString(language),
    applicationsNotApplicable,
  };
}

/** One resolved chart bucket — raw keys for recharts + a formatted axis label. */
export interface EmployerStatsChartPointVM {
  /** The raw `YYYY-MM-DD` bucket key (recharts XAxis dataKey). */
  date: string;
  /** Short, locale-formatted date for the axis + tooltip heading. */
  label: string;
  views: number;
  applyClicks: number;
}

export interface EmployerStatsChartVM {
  points: EmployerStatsChartPointVM[];
  /**
   * `true` when there is nothing to plot — no buckets, or every bucket is a
   * zero for both series. Drives the honest "No activity yet" state instead of
   * a flat line on a broken axis.
   */
  isEmpty: boolean;
  totalViews: number;
  totalApplyClicks: number;
}

/**
 * Map the daily timeseries buckets to plain chart rows, resolving the date
 * label once and computing the all-zero empty state. Buckets arrive zero-filled
 * and ascending, so we preserve order and never reshape the window.
 */
export function toEmployerStatsChartVM(
  points: readonly EmployerJobStatsPoint[],
  language: string,
): EmployerStatsChartVM {
  const rows: EmployerStatsChartPointVM[] = points.map((point) => ({
    date: point.date,
    label: formatDate(language, point.date) ?? point.date,
    views: point.views,
    applyClicks: point.applyClicks,
  }));
  const totalViews = rows.reduce((sum, row) => sum + row.views, 0);
  const totalApplyClicks = rows.reduce((sum, row) => sum + row.applyClicks, 0);
  return {
    points: rows,
    isEmpty: rows.length === 0 || (totalViews === 0 && totalApplyClicks === 0),
    totalViews,
    totalApplyClicks,
  };
}

/** One resolved profile-views sparkline bucket. */
export interface EmployerProfileViewsPointVM {
  /** The raw `YYYY-MM-DD` bucket key (recharts XAxis dataKey). */
  date: string;
  /** Short, locale-formatted date for the tooltip heading. */
  label: string;
  views: number;
}

/**
 * The resolved profile-views summary for the company-profile page header — a
 * number-formatted total plus an optional sparkline. `isEmpty` gates the honest
 * "No views yet" state: it's true when the total is zero (which also covers an
 * analytics outage, since the endpoint zero-fills). The sparkline is only worth
 * drawing when a bucket actually has a view, so `points` is left empty until then.
 */
export interface EmployerProfileViewsVM {
  /** Locale-formatted total over the window (e.g. "1,204"). */
  total: string;
  /** True when there is nothing to report — drives "No views yet". */
  isEmpty: boolean;
  /** Sparkline buckets, or `[]` when every bucket is zero (nothing to plot). */
  points: EmployerProfileViewsPointVM[];
}

/**
 * Resolve the profile-views header stat. `total` is the authoritative
 * last-30-days summary (from `profileStats.retrieve`); `points` is the daily
 * timeseries for the sparkline. Both degrade to the empty state on zero.
 */
export function toEmployerProfileViewsVM(
  total: number,
  points: readonly EmployerProfileViewsPoint[],
  language: string,
): EmployerProfileViewsVM {
  const rows: EmployerProfileViewsPointVM[] = points.map((point) => ({
    date: point.date,
    label: formatDate(language, point.date) ?? point.date,
    views: point.views,
  }));
  const hasPlottableViews = rows.some((row) => row.views > 0);
  return {
    total: total.toLocaleString(language),
    isEmpty: total === 0,
    // Never plot a flat all-zero sparkline — leave it empty so the stat stands
    // alone with its honest zero state instead of a dead axis.
    points: hasPlottableViews ? rows : [],
  };
}
