/**
 * Salary VIEW-MODEL — the Layer-1b seam for the salary block. These mappers
 * are the only place SDK formatters (`formatSalaryStat`,
 * `formatSalaryStatRange`), taxonomy label resolution (`enumLabel`) and i18n
 * copy (the route-owned copy resolvers) touch the salary sections. Each maps
 * raw route data to a plain, fully-resolved view-model.
 *
 * The presentational sections (`OverallSalaryCard`, `SenioritySalaryTable`,
 * `SalaryRail`, `SalaryFaq`, `SalaryBreadcrumb`) render from these VMs alone
 * and import nothing from `@cavuno/board*` or `#/copy` — so restructuring a
 * salary page is pure markup over these stable contracts.
 *
 * Currency is required for any salary figure — missing currency yields null
 * (never invent USD).
 */
import { formatSalaryStat, formatSalaryStatRange } from '@cavuno/board/format';
import {
  companySalaryPath,
  encodePathSegment,
  salaryLocationPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';

import { enumLabel } from '@/lib/enum-labels';
import {
  salaryCompanyCategoryTitleFrame,
  salaryCompanyMetaDescriptionFrame,
  salaryCompanyTitleFrame,
  salaryEntityInPlaceTitleFrame,
  salaryEntityTitleFrame,
  salaryPlaceTitleFrame,
} from '@/lib/salary-frames';

/**
 * Presentation re-export of the SDK range formatter. Route modules must not
 * import `@cavuno/board/seo` (head/meta lives in route-owned server pages);
 * components that need a formatted range for rails call this mapper helper.
 * Currency comes from the salary read model — never hardcoded.
 */
export function formatSalaryRange(
  language: string,
  min: number,
  max: number,
  currency: string | null | undefined,
): string | null {
  return formatSalaryStatRange(language, min, max, currency);
}

import { jobDetailCopy } from '@/copy-groups/job-detail';
import { salaryCopy } from '@/copy-groups/salary';
import { entityCount } from '@/lib/entity-count';
import { chromeEntity } from '@/lib/site-chrome';
import { m } from '@/paraglide/messages';

/**
 * Salary URL composers — the Layer-1b seam for the salary hrefs the SDK's
 * `@cavuno/board/paths` does not expose directly. The SDK owns the canonical
 * single-axis paths (`companySalaryPath`, `salaryTitlePath`, `salarySkillPath`,
 * `salaryLocationPath`); these compose the cross-axis and company-category
 * hrefs ON TOP of those helpers so the whole salary URL structure has ONE
 * source of truth and never drifts from the hosted board (AGENTS.md rule 7).
 * Routes call these instead of string-building `/salaries/…` or
 * `/companies/…/salaries` paths inline.
 */

/** A company's salary page for a single job category. */
export function companyCategorySalaryPath(
  companySlug: string,
  categorySlug: string,
): string {
  return `${companySalaryPath(companySlug)}/${encodePathSegment(categorySlug)}`;
}

/** Cross-axis: a job title's salary in one place. */
export function salaryTitleInLocationPath(
  titleSlug: string,
  placeSlug: string,
): string {
  return `${salaryTitlePath(titleSlug)}/${encodePathSegment(placeSlug)}`;
}

/** Cross-axis: the "all locations" fan-out for a job title's salary. */
export function salaryTitleLocationsPath(titleSlug: string): string {
  return `${salaryTitlePath(titleSlug)}/locations`;
}

/** Cross-axis: a skill's salary in one place. */
export function salarySkillInLocationPath(
  skillSlug: string,
  placeSlug: string,
): string {
  return `${salarySkillPath(skillSlug)}/${encodePathSegment(placeSlug)}`;
}

/** Cross-axis: the "all locations" fan-out for a skill's salary. */
export function salarySkillLocationsPath(skillSlug: string): string {
  return `${salarySkillPath(skillSlug)}/locations`;
}

/** Cross-axis: the job-titles fan-out inside a place's salary page. */
export function salaryLocationTitlesPath(placeSlug: string): string {
  return `${salaryLocationPath(placeSlug)}/titles`;
}

/** Cross-axis: the skills fan-out inside a place's salary page. */
export function salaryLocationSkillsPath(placeSlug: string): string {
  return `${salaryLocationPath(placeSlug)}/skills`;
}

/**
 * Salary page `<title>` sentence frames — whole Paraglide ICU sentences
 * with named parameters. Numbers arrive pre-formatted (`formatSalaryStatRange`);
 * the frame supplies the words. The visible H1 stays a starter copy key — only
 * the metadata titles route through here.
 */
export function salaryEntityTitle(
  _language: string,
  entity: string,
  range: string,
): string {
  return salaryEntityTitleFrame(entity, range);
}

export function salaryEntityInPlaceTitle(
  _language: string,
  entity: string,
  place: string,
  range: string,
): string {
  return salaryEntityInPlaceTitleFrame(entity, place, range);
}

export function salaryPlaceTitle(
  _language: string,
  place: string,
  range: string | null,
): string {
  return salaryPlaceTitleFrame(place, range);
}

export function salaryCompanyTitle(
  _language: string,
  company: string,
  range: string | null,
): string {
  return salaryCompanyTitleFrame(company, range);
}

/**
 * Meta description for a company salary overview, derived from the same
 * aggregate the page renders. Returns the no-data sentence when the company
 * has no salary aggregate at all.
 */
export function salaryCompanyMetaDescription(
  _language: string,
  args: {
    company: string;
    range: string | null;
    jobCount: number | null;
    categoryCount: number;
    year: number;
  },
): string {
  return salaryCompanyMetaDescriptionFrame(args);
}

export function salaryCompanyCategoryTitle(
  _language: string,
  company: string,
  category: string,
  range: string | null,
): string {
  return salaryCompanyCategoryTitleFrame(company, category, range);
}

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
  currency: string | null | undefined,
): OverallSalaryVM {
  const overrides = chromeEntity();
  const copy = salaryCopy();
  const median =
    overall.medianMin !== undefined && overall.medianMax !== undefined
      ? Math.round((overall.medianMin + overall.medianMax) / 2)
      : null;

  const stats: SalaryStatVM[] = [];
  if (overall.p25Min !== undefined) {
    const value = formatSalaryStat(language, overall.p25Min, currency);
    if (value !== null) {
      stats.push({
        label: copy.comparisonPercentile25Label,
        value,
      });
    }
  }
  if (median !== null) {
    const value = formatSalaryStat(language, median, currency);
    if (value !== null) {
      stats.push({
        label: copy.medianLabel,
        value,
        emphasis: true,
      });
    }
  }
  if (overall.p75Max !== undefined) {
    const value = formatSalaryStat(language, overall.p75Max, currency);
    if (value !== null) {
      stats.push({
        label: copy.comparisonPercentile75Label,
        value,
      });
    }
  }
  stats.push({
    label: copy.basedOnLabel,
    value: entityCount(overall.jobCount, language, m.count_jobs, {
      singular: overrides.jobSingular,
      plural: overrides.jobPlural,
    }),
  });

  const headlineValue =
    formatSalaryStatRange(language, overall.avgMin, overall.avgMax, currency) ??
    '';
  return {
    headlineLabel: copy.comparisonHeadlineAverage,
    headlineValue,
    // No amount (e.g. currency null) → no money chrome: a bare "/ year"
    // beside a blank figure is the suffix outliving the value it qualifies.
    perYearSuffix: headlineValue ? copy.perYearSuffix : '',
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
  currency: string | null | undefined,
): SeniorityTableVM {
  const copy = salaryCopy();
  return {
    headers: {
      level: copy.seniorityTableHeaderLevel,
      avg: copy.seniorityTableHeaderAvg,
      baseline: copy.boardBaselineLabel,
      diff: copy.seniorityTableHeaderDiff,
    },
    rows: rows.map((r) => ({
      key: r.seniority,
      level: enumLabel(r.seniority) ?? r.seniority.replace(/[-_]/g, ' '),
      avg:
        formatSalaryStatRange(
          language,
          r.avgSalaryMin,
          r.avgSalaryMax,
          currency,
        ) ?? '',
      baseline:
        r.boardAvgMin !== null && r.boardAvgMax !== null
          ? (formatSalaryStatRange(
              language,
              r.boardAvgMin,
              r.boardAvgMax,
              currency,
            ) ?? '—')
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
): SalaryRailVM {
  const overrides = chromeEntity();
  return {
    title,
    items: items.map((item) => ({
      name: item.name,
      href: item.href,
      range: item.range,
      logoPath: item.logoPath,
      jobCountLabel: entityCount(item.jobCount, language, m.count_jobs, {
        singular: overrides.jobSingular,
        plural: overrides.jobPlural,
      }),
    })),
  };
}

export interface SalaryFaqVM {
  heading: string;
  items: { q: string; a: string }[];
}

export function toSalaryFaqVM(
  items: { q: string; a: string }[],
  _language: string,
): SalaryFaqVM {
  return {
    heading: salaryCopy().faqHeading,
    items,
  };
}

/**
 * A node of the flat place tree returned by `salaries.locations.list()` — the
 * only public-SDK source of place ancestry (`LocationSalaryDetail` itself has
 * no hierarchy field; the hosted board reads it from an internal places table).
 */
export interface SalaryLocationNode {
  placeSlug: string;
  placeName: string;
  parentSlug: string | null;
}

/**
 * Resolve a place's ancestor breadcrumb chain from the flat location tree.
 * Walks `parentSlug` up from the current place to the root, orders it
 * country → … → current, links every ANCESTOR to its own
 * `/salaries/locations/{slug}` page, and leaves the CURRENT place terminal
 * (no href) — mirroring the hosted salary-location breadcrumb. Falls back to a
 * single terminal crumb when the place is absent from the tree or has no
 * resolvable ancestors. Paths compose through `salaryLocationPath`, never
 * string-built.
 */
export function toLocationHierarchyCrumbs(
  tree: SalaryLocationNode[],
  currentSlug: string,
  currentName: string,
): { name: string; href?: string }[] {
  const bySlug = new Map(tree.map((n) => [n.placeSlug, n]));
  const chain: SalaryLocationNode[] = [];
  const seen = new Set<string>();
  let node = bySlug.get(currentSlug);
  while (node && !seen.has(node.placeSlug)) {
    seen.add(node.placeSlug);
    chain.unshift(node);
    node = node.parentSlug ? bySlug.get(node.parentSlug) : undefined;
  }
  if (chain.length === 0) return [{ name: currentName }];
  return chain.map((n, index) =>
    index === chain.length - 1
      ? { name: currentName }
      : { name: n.placeName, href: salaryLocationPath(n.placeSlug) },
  );
}

export interface SalaryBreadcrumbVM {
  ariaLabel: string;
  items: { name: string; href?: string }[];
}

export function toSalaryBreadcrumbVM(
  items: { name: string; href?: string }[],
  _language: string,
): SalaryBreadcrumbVM {
  return {
    ariaLabel: jobDetailCopy().breadcrumbAriaLabel,
    items,
  };
}
