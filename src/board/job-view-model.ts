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

import { boardCopy } from '@/copy';
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

/**
 * Collect the DEDUPED union of category/skill tag slugs across a page of job
 * cards, as `resolveTaxonomyChips` candidates. A loader resolves this set once
 * (a 20-card page has far fewer unique tags than 20×N) and threads the returned
 * map into every card's `toJobCardVM`, so the whole page's pills share one
 * batched resolve round trip.
 */
export function collectCardTaxonomyCandidates(
  jobs: readonly Pick<PublicJobCard, 'categories' | 'skills'>[],
): { type: 'category' | 'skill'; slug: string }[] {
  const seen = new Set<string>();
  const candidates: { type: 'category' | 'skill'; slug: string }[] = [];
  const add = (type: 'category' | 'skill', slug: string) => {
    const key = `${type}:${slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ type, slug });
  };
  for (const job of jobs) {
    for (const c of job.categories ?? []) add('category', c.slug);
    for (const s of job.skills ?? []) add('skill', s.slug);
  }
  return candidates;
}

export function toJobCardVM(
  job: PublicJobCard,
  language: string,
  labels?: BoardLabelOverrides,
  /**
   * Optional `${'category' | 'skill'}:${slug}` → canonicalSlug map of the tag
   * pills that resolve to a real page (from `resolveTaxonomyChips`). When
   * supplied, category/skill pills whose slug is absent are omitted and the
   * survivors link via their canonical slug — the same resolves-or-omits guard
   * `toJobDetailVM` applies, so a card never links to a `/jobs/:slug` that 404s
   * on a board whose facet/tag read model has drifted from its resolve read
   * model. When omitted, every pill renders as-is (the resolver is consulted
   * only where a loader can afford the round trip).
   */
  resolvableTaxonomy?: Record<string, string>,
): JobCardVM {
  const company = job.company;

  // Keep only pills that will land on a live page, canonicalising the slug. A
  // missing map means "don't filter"; an empty map filters everything out,
  // which is correct when nothing resolved (e.g. a resolve outage).
  const tagPill = (
    type: 'category' | 'skill',
    term: { slug: string; name: string },
  ): JobCardTagVM | null => {
    const prefix = type === 'category' ? 'c' : 's';
    const path = type === 'category' ? jobsCategoryPath : jobsSkillPath;
    if (!resolvableTaxonomy) {
      return { key: `${prefix}-${term.slug}`, name: term.name, href: path(term.slug) };
    }
    const canonical = resolvableTaxonomy[`${type}:${term.slug}`];
    if (!canonical) return null;
    return { key: `${prefix}-${canonical}`, name: term.name, href: path(canonical) };
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
    featuredLabel: boardCopy(language, labels).jobCard.featuredLabel,
    postedAtLabel: formatPublishedRelativeDate(language, job.publishedAt),
    tags: [
      ...job.categories.map((c) => tagPill('category', c)),
      ...job.skills.map((s) => tagPill('skill', s)),
    ].filter((tag): tag is JobCardTagVM => tag !== null),
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
