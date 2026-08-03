/**
 * Salary VIEW-MODEL — the Layer-1b seam for the salary block. These mappers
 * are the only place SDK formatters (`formatRange`,
 * `formatUsd`), taxonomy label resolution (`fieldLabel`) and i18n copy
 * (the route-owned copy resolvers) touch the salary sections. Each maps raw
 * route data to a
 * plain, fully-resolved view-model.
 *
 * The presentational sections (`OverallSalaryCard`, `SenioritySalaryTable`,
 * `SalaryRail`, `SalaryFaq`, `SalaryBreadcrumb`) render from these VMs alone
 * and import nothing from `@cavuno/board*` or `#/copy` — so restructuring a
 * salary page is pure markup over these stable contracts.
 */
import {
  fieldLabel,
  getSalaryLexicon,
  type BoardLabelOverrides,
} from '@cavuno/board/format';
import {
  companySalaryPath,
  salaryLocationPath,
  salarySkillPath,
  salaryTitlePath,
} from '@cavuno/board/paths';
import { formatRange, formatUsd } from '@cavuno/board/seo';

import { entityCopy } from '@/copy-groups/entity';
import { jobDetailCopy } from '@/copy-groups/job-detail';
import { salaryCopy } from '@/copy-groups/salary';

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
  return `${companySalaryPath(companySlug)}/${categorySlug}`;
}

/** Cross-axis: a job title's salary in one place. */
export function salaryTitleInLocationPath(
  titleSlug: string,
  placeSlug: string,
): string {
  return `${salaryTitlePath(titleSlug)}/${placeSlug}`;
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
  return `${salarySkillPath(skillSlug)}/${placeSlug}`;
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
 * Salary page `<title>` sentence frames — the ONE seam onto the SDK's
 * board-language salary lexicon (`getSalaryLexicon(language).frames`), the same
 * builders the hosted board uses. A tenant frontend inherits the canonical
 * plural, board-localized "{Entity} Salaries (range)" phrasing instead of a
 * starter-local Paraglide duplicate (which drifted to a singular "salary").
 * Numbers arrive pre-formatted (`formatRange`); the frame supplies the words.
 * The visible H1 stays a starter copy key — the SDK has no range-less heading
 * frame — so only the metadata titles route through here.
 */
export function salaryEntityTitle(
  language: string,
  entity: string,
  range: string,
): string {
  return getSalaryLexicon(language).frames.entitySalariesTitle({
    entity,
    range,
  });
}

export function salaryEntityInPlaceTitle(
  language: string,
  entity: string,
  place: string,
  range: string,
): string {
  return getSalaryLexicon(language).frames.entitySalariesInPlaceTitle({
    entity,
    place,
    range,
  });
}

export function salaryPlaceTitle(
  language: string,
  place: string,
  range: string | null,
): string {
  const { frames } = getSalaryLexicon(language);
  return range
    ? frames.salariesInPlaceTitle({ place, range })
    : frames.salariesInPlaceTitleNoRange({ place });
}

export function salaryCompanyTitle(
  language: string,
  company: string,
  range: string | null,
): string {
  return getSalaryLexicon(language).frames.companySalariesTitle({
    company,
    range,
  });
}

export function salaryCompanyCategoryTitle(
  language: string,
  company: string,
  category: string,
  range: string | null,
): string {
  return getSalaryLexicon(language).frames.companyCategorySalariesTitle({
    company,
    category,
    range,
  });
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
  labels?: BoardLabelOverrides,
): OverallSalaryVM {
  const entity = entityCopy(language, labels);
  const copy = salaryCopy(language, labels);
  const median =
    overall.medianMin !== undefined && overall.medianMax !== undefined
      ? Math.round((overall.medianMin + overall.medianMax) / 2)
      : null;

  const stats: SalaryStatVM[] = [];
  if (overall.p25Min !== undefined) {
    stats.push({
      label: copy.comparisonPercentile25Label,
      value: formatUsd(language, overall.p25Min),
    });
  }
  if (median !== null) {
    stats.push({
      label: copy.medianLabel,
      value: formatUsd(language, median),
      emphasis: true,
    });
  }
  if (overall.p75Max !== undefined) {
    stats.push({
      label: copy.comparisonPercentile75Label,
      value: formatUsd(language, overall.p75Max),
    });
  }
  stats.push({
    label: copy.basedOnLabel,
    value: `${overall.jobCount} ${overall.jobCount === 1 ? entity.jobSingular : entity.jobPlural}`,
  });

  return {
    headlineLabel: copy.comparisonHeadlineAverage,
    headlineValue: formatRange(language, overall.avgMin, overall.avgMax),
    perYearSuffix: copy.perYearSuffix,
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
  const copy = salaryCopy(language, labels);
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
  const copy = entityCopy(language, labels);
  return {
    title,
    items: items.map((item) => ({
      name: item.name,
      href: item.href,
      range: item.range,
      logoPath: item.logoPath,
      jobCountLabel: `${item.jobCount} ${item.jobCount === 1 ? copy.jobSingular : copy.jobPlural}`,
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
    heading: salaryCopy(language, labels).faqHeading,
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
  language: string,
  labels?: BoardLabelOverrides,
): SalaryBreadcrumbVM {
  return {
    ariaLabel: jobDetailCopy(language, labels).breadcrumbAriaLabel,
    items,
  };
}
