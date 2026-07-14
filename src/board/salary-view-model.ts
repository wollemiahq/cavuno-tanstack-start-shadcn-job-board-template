import { boardCopy } from '#/copy';
/**
 * Salary VIEW-MODEL — the Layer-1b seam for the salary block (ADR-0070
 * Phase 2). These mappers are the ONLY place SDK formatters (`formatRange`,
 * `formatUsd`), taxonomy label resolution (`fieldLabel`) and i18n copy
 * (`boardCopy`) touch the salary sections. Each maps raw route data to a
 * plain, fully-resolved view-model.
 *
 * The presentational sections (`OverallSalaryCard`, `SenioritySalaryTable`,
 * `SalaryRail`, `SalaryFaq`, `SalaryBreadcrumb`) render from these VMs alone
 * and import nothing from `@cavuno/board*` or `#/copy` — so restructuring a
 * salary page is pure markup over these stable contracts.
 */
import { fieldLabel, type BoardLabelOverrides } from '@cavuno/board/format';
import { formatRange, formatUsd } from '@cavuno/board/seo';

export interface OverallSalary {
  avgMin: number;
  avgMax: number;
  jobCount: number;
  medianMin?: number;
  medianMax?: number;
  p25Min?: number;
  p75Max?: number;
}

export interface SalaryStatVM {
  label: string;
  value: string;
  /** The row's key figure gets the brass underline signature. */
  emphasis?: boolean;
}

export interface OverallSalaryVM {
  headlineLabel: string;
  headlineValue: string;
  perYearSuffix: string;
  stats: SalaryStatVM[];
}

export function toOverallSalaryVM(
  overall: OverallSalary,
  language: string,
  labels?: BoardLabelOverrides,
): OverallSalaryVM {
  const copy = boardCopy(language, labels);
  const median =
    overall.medianMin !== undefined && overall.medianMax !== undefined
      ? Math.round((overall.medianMin + overall.medianMax) / 2)
      : null;

  const stats: SalaryStatVM[] = [];
  if (overall.p25Min !== undefined) {
    stats.push({
      label: copy.salary.comparisonPercentile25Label,
      value: formatUsd(language, overall.p25Min),
    });
  }
  if (median !== null) {
    stats.push({
      label: copy.salary.medianLabel,
      value: formatUsd(language, median),
      emphasis: true,
    });
  }
  if (overall.p75Max !== undefined) {
    stats.push({
      label: copy.salary.comparisonPercentile75Label,
      value: formatUsd(language, overall.p75Max),
    });
  }
  stats.push({
    label: copy.salary.basedOnLabel,
    value: `${overall.jobCount} ${
      overall.jobCount === 1 ? copy.entity.jobSingular : copy.entity.jobPlural
    }`,
  });

  return {
    headlineLabel: copy.salary.comparisonHeadlineAverage,
    headlineValue: formatRange(language, overall.avgMin, overall.avgMax),
    perYearSuffix: copy.salary.perYearSuffix,
    stats,
  };
}

export interface SeniorityRow {
  seniority: string;
  avgSalaryMin: number;
  avgSalaryMax: number;
  jobCount: number;
  boardAvgMin: number | null;
  boardAvgMax: number | null;
  diffPercent: number | null;
}

export interface SeniorityRowVM {
  key: string;
  level: string;
  avg: string;
  baseline: string;
  diff: { text: string; positive: boolean } | null;
}

export interface SeniorityTableVM {
  headers: { level: string; avg: string; baseline: string; diff: string };
  rows: SeniorityRowVM[];
}

export function toSeniorityTableVM(
  rows: SeniorityRow[],
  language: string,
  labels?: BoardLabelOverrides,
): SeniorityTableVM {
  const copy = boardCopy(language, labels).salary;
  return {
    headers: {
      level: copy.seniorityTableHeaderLevel,
      avg: copy.seniorityTableHeaderAvg,
      baseline: copy.boardBaselineLabel,
      diff: copy.seniorityTableHeaderDiff,
    },
    rows: rows.map((r) => ({
      key: r.seniority,
      level:
        fieldLabel(language, r.seniority, labels) ??
        r.seniority.replace(/[-_]/g, ' '),
      avg: formatRange(language, r.avgSalaryMin, r.avgSalaryMax),
      baseline:
        r.boardAvgMin !== null && r.boardAvgMax !== null
          ? formatRange(language, r.boardAvgMin, r.boardAvgMax)
          : '—',
      diff:
        r.diffPercent !== null
          ? {
              text: `${r.diffPercent >= 0 ? '+' : ''}${r.diffPercent}%`,
              positive: r.diffPercent >= 0,
            }
          : null,
    })),
  };
}

/** Route-built rail row (raw). `range` is pre-formatted by the route. */
export interface RailItem {
  name: string;
  href: string;
  range: string;
  jobCount: number;
  logoPath?: string | null;
}

export interface SalaryRailItemVM {
  name: string;
  href: string;
  range: string;
  jobCountLabel: string;
  logoPath?: string | null;
}

export interface SalaryRailVM {
  title?: string;
  items: SalaryRailItemVM[];
}

export function toSalaryRailVM(
  title: string | undefined,
  items: RailItem[],
  language: string,
  labels?: BoardLabelOverrides,
): SalaryRailVM {
  const copy = boardCopy(language, labels).entity;
  return {
    title,
    items: items.map((item) => ({
      name: item.name,
      href: item.href,
      range: item.range,
      logoPath: item.logoPath,
      jobCountLabel: `${item.jobCount} ${
        item.jobCount === 1 ? copy.jobSingular : copy.jobPlural
      }`,
    })),
  };
}

export interface SalaryFaqVM {
  heading: string;
  items: { q: string; a: string }[];
}

export function toSalaryFaqVM(
  items: { q: string; a: string }[],
  language: string,
  labels?: BoardLabelOverrides,
): SalaryFaqVM {
  return {
    heading: boardCopy(language, labels).salary.faqHeading,
    items,
  };
}

export interface SalaryBreadcrumbVM {
  ariaLabel: string;
  items: { name: string; href?: string }[];
}

export function toSalaryBreadcrumbVM(
  items: { name: string; href?: string }[],
  language: string,
  labels?: BoardLabelOverrides,
): SalaryBreadcrumbVM {
  return {
    ariaLabel: boardCopy(language, labels).jobDetail.breadcrumbAriaLabel,
    items,
  };
}
