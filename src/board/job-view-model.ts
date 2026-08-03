/**
 * Job card VIEW-MODEL — the Layer-1b seam for the job-card / job-search
 * block. `toJobCardVM` is the only place SDK wire
 * types, formatters, i18n copy, the honest-summary derivation, and path
 * helpers touch a job card. It maps a `PublicJobCard` to a plain,
 * fully-resolved `JobCardVM`.
 *
 * The presentational cards (`JobCard`, the search page's featured card)
 * render from `JobCardVM` alone and import nothing from `@cavuno/board*` —
 * so restructuring a card is pure markup over this stable contract.
 */
import {
  cardLocationLabel,
  fieldLabel,
  formatPublishedRelativeDate,
  formatSalaryRange,
  fullJobToCard,
  type BoardLabelOverrides,
} from '@cavuno/board/format';
import {
  jobDetailPath,
  jobsCategoryPath,
  jobsSkillPath,
} from '@cavuno/board/paths';

import { m } from '../paraglide/messages';

import { jobCardCopy } from '@/copy-groups/job-card';
import { deriveSummary } from '@/lib/derive-summary';
import type { PublicJob, PublicJobCard } from '@cavuno/board';

export interface JobCardTagVM {
  key: string;
  name: string;
  href: string;
}

export interface JobCardVM {
  id: string;
  title: string;
  /** Slugs for the typed detail route, or `null` when unlinkable. */
  companySlug: string | null;
  jobSlug: string | null;
  /** Canonical board-relative detail href, or `null` when unlinkable. */
  detailHref: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  /** Avatar fallback name (company name, else the job title). */
  companyAvatarName: string;
  /** "Salary · Location", omitting whichever half is missing. */
  compLine: string | null;
  /** Salary is independent so dense search cards do not hide location. */
  salaryLabel: string | null;
  /**
   * Raw wire salary values alongside the formatted label. When the
   * operator wants a DIFFERENT salary presentation than the hosted
   * default (full numbers, no currency symbol, monthly, …), re-format
   * these in the component (e.g. `Intl.NumberFormat`) — never parse or
   * post-process `salaryLabel`, whose shape is locale-dependent.
   */
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryTimeframe: string | null;
  /** Raw publish timestamp behind `postedAtLabel`, for re-presentation. */
  publishedAt: string | null;
  /** Physical/applicant geography followed by the workplace type. */
  locationLabel: string;
  /** Honest one-line summary from the real description, or `null`. */
  summary: string | null;
  isFeatured: boolean;
  featuredLabel: string;
  /** Relative published label ("5d ago"), hosted-board parity, or `null`. */
  postedAtLabel: string | null;
  /** Category + skill chips (categories first) with resolved hrefs. */
  tags: JobCardTagVM[];
}

export function toJobCardVM(
  job: PublicJobCard,
  language: string,
  labels?: BoardLabelOverrides,
): JobCardVM {
  const company = job.company;

  // Every emitted slug resolves — the platform guarantees it (ADR-0099), so
  // pills link directly with no resolve round trip and no filtering.
  const tagPill = (
    type: 'category' | 'skill',
    term: { slug: string; name: string },
  ): JobCardTagVM => {
    const prefix = type === 'category' ? 'c' : 's';
    const path = type === 'category' ? jobsCategoryPath : jobsSkillPath;
    return {
      key: `${prefix}-${term.slug}`,
      name: term.name,
      href: path(term.slug),
    };
  };
  const salaryLabel = formatSalaryRange(
    language,
    job.salaryMin,
    job.salaryMax,
    job.salaryTimeframe,
    job.salaryCurrency,
  );
  const workplaceLabel = job.remoteOption
    ? fieldLabel(language, job.remoteOption, labels)
    : null;
  const placeLabel =
    job.remoteOption === 'remote' ? job.remoteLocationLabel : job.locationLabel;
  const locationLabel = [
    placeLabel || m.jobDetail_locationNotSpecifiedLabel(),
    workplaceLabel ? `(${workplaceLabel})` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const compLine =
    [salaryLabel, cardLocationLabel(language, job)]
      .filter(Boolean)
      .join(' · ') || null;

  return {
    id: job.id,
    title: job.title,
    companySlug: company?.slug ?? null,
    jobSlug: job.slug ?? null,
    detailHref:
      company?.slug && job.slug ? jobDetailPath(company.slug, job.slug) : null,
    companyName: company?.name ?? null,
    companyLogoUrl: company?.logoUrl ?? null,
    companyAvatarName: company?.name ?? job.title,
    compLine,
    salaryLabel,
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    salaryCurrency: job.salaryCurrency ?? null,
    salaryTimeframe: job.salaryTimeframe ?? null,
    publishedAt: job.publishedAt ?? null,
    locationLabel,
    summary: deriveSummary(job.description),
    isFeatured: job.isFeatured,
    featuredLabel: jobCardCopy(language, labels).featuredLabel,
    postedAtLabel: formatPublishedRelativeDate(language, job.publishedAt),
    tags: [
      ...job.categories.map((c) => tagPill('category', c)),
      ...job.skills.map((s) => tagPill('skill', s)),
    ],
  };
}

/**
 * Card VM for a saved-jobs row. The saved-list embed is a slimmer projection
 * than the `PublicJob` type promises — the arrays the card pipeline
 * dereferences (`officeLocations`, `categories`, `skills`) can be absent on
 * the wire — so they are defaulted before the SDK card mapper runs. Returns
 * `null` when a row still cannot map, so one stale embed never fails the
 * whole saved-jobs page.
 */
export function toSavedJobCardVM(
  job: PublicJob,
  language: string,
  labels?: BoardLabelOverrides,
): JobCardVM | null {
  try {
    const card = fullJobToCard(language, {
      ...job,
      officeLocations: job.officeLocations ?? [],
      categories: job.categories ?? [],
      skills: job.skills ?? [],
    });
    return toJobCardVM(card, language, labels);
  } catch {
    return null;
  }
}
