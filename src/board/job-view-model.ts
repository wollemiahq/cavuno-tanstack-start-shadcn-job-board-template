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
import { formatPublishedRelativeDate } from '@cavuno/board/format';
import {
  jobDetailPath,
  jobsCategoryPath,
  jobsSkillPath,
} from '@cavuno/board/paths';

import { m } from '../paraglide/messages';
import { isLocale } from '../paraglide/runtime';

import { resolveJobForm, type JobFormVisibility } from '@/board/job-form';
import { jobCardCopy } from '@/copy-groups/job-card';
import { cardSummary } from '@/lib/derive-summary';
import { enumLabel } from '@/lib/enum-labels';
import {
  cardLocationLabel,
  isWorldwideRemote,
  localizedRemoteRegion,
} from '@/lib/location-labels';
import { formatJobSalary } from '@/lib/salary-display';
import type { PublicJobCard } from '@cavuno/board';

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
  /** Honest one-line teaser from the API card `summary` (or derived), or `null`. */
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
  jobForm?: JobFormVisibility | unknown,
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
  const salaryVisible = resolveJobForm(jobForm).salary.visible;
  const salaryLabel = salaryVisible
    ? formatJobSalary(
        language,
        job.salaryMin,
        job.salaryMax,
        job.salaryTimeframe,
        job.salaryCurrency,
      )
    : null;
  const workplaceLabel = job.remoteOption
    ? enumLabel(job.remoteOption, language)
    : null;
  const localeOpt = isLocale(language) ? { locale: language } : undefined;
  // The card wire model pre-resolves `remoteLocationLabel` in the BOARD
  // language, and for unrestricted remote jobs that is the chrome word
  // "Worldwide" — a word, not a place name. Re-word it from the catalog so
  // /de/ reads "Remote (weltweit)". Structural fix (a `remoteWorldwide`
  // boolean on the card model) is a platform follow-up; until then this
  // sentinel is stable for English-language boards.
  const worldwideRemote = isWorldwideRemote(job);
  const placeLabel =
    job.remoteOption === 'remote'
      ? localizedRemoteRegion(job, language)
      : job.locationLabel;
  const locationLabel = worldwideRemote
    ? m.label_locationRemoteWorldwide({}, localeOpt)
    : [
        placeLabel || m.jobDetail_locationNotSpecifiedLabel({}, localeOpt),
        workplaceLabel ? `(${workplaceLabel})` : null,
      ]
        .filter(Boolean)
        .join(' ');
  const compLine =
    [salaryLabel, cardLocationLabel(job, language)]
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
    // Platform card teaser only — never re-derive from description HTML.
    summary: cardSummary(job),
    isFeatured: job.isFeatured,
    featuredLabel: jobCardCopy().featuredLabel,
    postedAtLabel: formatPublishedRelativeDate(language, job.publishedAt),
    tags: [
      ...job.categories.map((c) => tagPill('category', c)),
      ...job.skills.map((s) => tagPill('skill', s)),
    ],
  };
}

/**
 * Card VM for a saved-jobs row. `me/saved-jobs` embeds a `PublicJobCard`
 * (same slim card as listings) — map with the same card view-model; do not
 * convert a full job. Defensive defaults for arrays keep a partial embed from
 * taking down the page. Returns `null` when a row cannot map at all.
 */
export function toSavedJobCardVM(
  job: PublicJobCard | null | undefined,
  language: string,
  jobForm?: JobFormVisibility | unknown,
): JobCardVM | null {
  if (!job) return null;
  try {
    return toJobCardVM(
      {
        ...job,
        categories: job.categories ?? [],
        skills: job.skills ?? [],
      },
      language,
      jobForm,
    );
  } catch {
    return null;
  }
}
