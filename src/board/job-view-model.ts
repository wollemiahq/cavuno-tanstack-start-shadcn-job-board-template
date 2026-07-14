import { boardCopy } from '#/copy';

/**
 * Job card VIEW-MODEL — the Layer-1b seam for the job-card / job-search
 * block (ADR-0070 Phase 2). `toJobCardVM` is the ONLY place SDK wire
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
  formatPublishedRelativeDate,
  formatSalaryRange,
  type BoardLabelOverrides,
} from '@cavuno/board/format';
import {
  jobDetailPath,
  jobsCategoryPath,
  jobsSkillPath,
} from '@cavuno/board/paths';

import { deriveSummary } from '@/lib/derive-summary';
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
  hasDetailLink: boolean;
  companyName: string | null;
  companyLogoUrl: string | null;
  /** Avatar fallback name (company name, else the job title). */
  companyAvatarName: string;
  /** First category name — the honest "sector" analogue, or `null`. */
  sector: string | null;
  /** "Salary · Location", omitting whichever half is missing. */
  compLine: string | null;
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
  const compLine =
    [
      formatSalaryRange(
        language,
        job.salaryMin,
        job.salaryMax,
        job.salaryTimeframe,
        job.salaryCurrency,
      ),
      cardLocationLabel(language, job),
    ]
      .filter(Boolean)
      .join(' · ') || null;

  return {
    id: job.id,
    title: job.title,
    companySlug: company?.slug ?? null,
    jobSlug: job.slug ?? null,
    detailHref:
      company?.slug && job.slug ? jobDetailPath(company.slug, job.slug) : null,
    hasDetailLink: Boolean(company?.slug && job.slug),
    companyName: company?.name ?? null,
    companyLogoUrl: company?.logoUrl ?? null,
    companyAvatarName: company?.name ?? job.title,
    sector: job.categories[0]?.name ?? null,
    compLine,
    summary: deriveSummary(job.description),
    isFeatured: job.isFeatured,
    featuredLabel: boardCopy(language, labels).jobCard.featuredLabel,
    postedAtLabel: formatPublishedRelativeDate(language, job.publishedAt),
    tags: [
      ...job.categories.map((c) => ({
        key: `c-${c.slug}`,
        name: c.name,
        href: jobsCategoryPath(c.slug),
      })),
      ...job.skills.map((s) => ({
        key: `s-${s.slug}`,
        name: s.name,
        href: jobsSkillPath(s.slug),
      })),
    ],
  };
}
