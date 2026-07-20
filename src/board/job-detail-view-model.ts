import { boardCopy } from '@/copy';

/**
 * Job detail VIEW-MODEL — the Layer-1b seam for the job-detail block
 * (ADR-0070 Phase 2). `toJobDetailVM` is the ONLY place SDK wire types,
 * formatters, i18n copy, taxonomy/custom-field resolution, breadcrumbs,
 * and path construction touch the job-detail page. It maps the loader's
 * data to a plain, fully-resolved `JobDetailVM` (strings + booleans).
 *
 * The presentational `JobDetail` component renders from `JobDetailVM`
 * alone and imports nothing from `@cavuno/board*` — so restructuring the
 * design is pure markup over this stable contract, and can't touch the
 * data/logic (correctness) layer.
 */
import {
  fieldLabel,
  formatPublishedRelativeDate,
  formatSalaryRange,
  resolveCustomFieldDisplay,
  type BoardLabelOverrides,
} from '@cavuno/board/format';
import {
  companyPath,
  jobDetailPath,
  jobsCategoryPath,
  jobsSkillPath,
} from '@cavuno/board/paths';
import { buildJobBreadcrumbs } from '@cavuno/board/seo';

import type { PublicBoard, PublicJob, PublicJobCard } from '@cavuno/board';

export interface JobDetailChipVM {
  key: string;
  name: string;
  href: string;
}

export interface JobDetailFactVM {
  label: string;
  value: string;
}

export interface JobDetailCustomFieldVM {
  key: string;
  label: string;
  /** Boolean fields are pre-resolved to their yes/no copy. */
  value: string;
}

export interface JobDetailCompanyVM {
  name: string | null;
  logoUrl: string | null;
  /** Normalised absolute website href (https:// prefixed), or `null`. */
  websiteHref: string | null;
  /** Website without the protocol, for display. */
  websiteLabel: string | null;
  /** Company profile path (canonical). */
  href: string;
  intro: string | null;
  viewProfileLabel: string;
}

export interface JobDetailSimilarVM {
  id: string;
  title: string;
  /** Slugs for the typed route link, or `null` when unlinkable. */
  companySlug: string | null;
  jobSlug: string | null;
  /** "Company · Salary", omitting whichever half is missing. */
  meta: string | null;
}

export interface JobDetailVM {
  /** A crumb with no `href` is the current page (matches the Breadcrumb API). */
  breadcrumbs: { name: string; href?: string }[];
  breadcrumbAriaLabel: string;

  // Header
  title: string;
  companyName: string | null;
  companyLogoUrl: string | null;
  /** Avatar fallback name (company name, else the job title). */
  companyAvatarName: string;
  sector: string | null;
  /** Physical or applicant geography, kept separate from workplace type. */
  locationLabel: string | null;
  workplaceLabel: string | null;
  employmentTypeLabel: string | null;
  seniorityLabel: string | null;
  salaryLabel: string | null;
  /** Fully-resolved "Posted X" line, or `null`. */
  publishedLabel: string | null;
  /** API canonical URL (for the copy-link control), or `null`. */
  canonicalUrl: string | null;
  /** Canonical board-relative full-page detail href, or `null`. */
  detailHref: string | null;

  // Body
  descriptionHtml: string | null;
  noDescriptionText: string;
  facts: JobDetailFactVM[];
  categoryChips: JobDetailChipVM[];
  skillChips: JobDetailChipVM[];
  categoriesHeading: string;
  skillsHeading: string;
  customFields: JobDetailCustomFieldVM[];
  additionalDetailsHeading: string;
  company: JobDetailCompanyVM | null;

  // Rail
  similar: JobDetailSimilarVM[];
  similarJobsHeading: string;
}

export function toJobDetailVM(
  job: PublicJob,
  customFields: PublicBoard['customFields'],
  similar: PublicJobCard[],
  companyIntro: string | null,
  language: string,
  labels?: BoardLabelOverrides,
): JobDetailVM {
  const copy = boardCopy(language, labels).jobDetail;
  const company = job.company;

  const offices = job.officeLocations
    .map(
      (o) =>
        o.displayName ??
        [o.city ?? o.locality, o.region, o.country].filter(Boolean).join(', '),
    )
    .filter(Boolean);

  const permitCountries = job.remoteWorldwide
    ? [copy.worldwideLabel]
    : job.remoteWorkPermitCountryCodes;

  const experience =
    typeof job.experienceMonths === 'number'
      ? job.experienceMonths === 0
        ? copy.noExperienceRequiredLabel
        : copy.experienceYears(Math.round(job.experienceMonths / 12))
      : null;

  const education =
    job.educationRequirements.length > 0
      ? job.educationRequirements
          .map(
            (value) =>
              fieldLabel(language, value, labels) ?? value.replace(/_/g, ' '),
          )
          .join(', ')
      : null;

  const facts: JobDetailFactVM[] = [];
  if (offices.length > 0)
    facts.push({ label: copy.locationsLabel, value: offices.join(' · ') });
  if (job.remoteOption === 'remote' && permitCountries.length > 0)
    facts.push({
      label: copy.workPermitsLabel,
      value: permitCountries.join(', '),
    });
  if (job.remoteTimezones.length > 0)
    facts.push({
      label: copy.timezonesLabel,
      value: job.remoteTimezones.map((tz) => tz.value).join(', '),
    });
  if (education) facts.push({ label: copy.educationLabel, value: education });
  if (experience)
    facts.push({ label: copy.experienceLabel, value: experience });

  const customFieldVms: JobDetailCustomFieldVM[] = resolveCustomFieldDisplay(
    customFields,
    job.customFieldValues,
  ).map((entry) => ({
    key: entry.key,
    label: entry.label,
    value:
      entry.kind === 'boolean'
        ? entry.value
          ? copy.customFieldYesLabel
          : copy.customFieldNoLabel
        : entry.value,
  }));

  const website = company?.website
    ? /^https?:\/\//i.test(company.website)
      ? company.website
      : `https://${company.website}`
    : null;

  const companyVm: JobDetailCompanyVM | null = company?.slug
    ? {
        name: company.name ?? null,
        logoUrl: company.logoUrl ?? null,
        websiteHref: website,
        websiteLabel: website ? website.replace(/^https?:\/\//, '') : null,
        href: companyPath(company.slug),
        intro: companyIntro,
        viewProfileLabel: copy.viewCompanyProfileLabel,
      }
    : null;

  const salaryLabel =
    formatSalaryRange(
      language,
      job.salaryMin,
      job.salaryMax,
      job.salaryTimeframe,
      job.salaryCurrency,
    ) || null;
  const published = formatPublishedRelativeDate(language, job.publishedAt);
  // Resolve remote work-permit ISO codes to country names the same way the
  // card mapper does (the SDK's card location label reads names the API
  // pre-resolved with `Intl.DisplayNames` region names) — so the detail
  // header no longer renders raw codes like "US, GB", and the two mappers
  // agree on the remote location.
  const regionNames = (() => {
    try {
      return new Intl.DisplayNames([language], { type: 'region' });
    } catch {
      return null;
    }
  })();
  const location =
    job.remoteOption === 'remote'
      ? job.remoteWorldwide
        ? copy.worldwideLabel
        : job.remoteWorkPermitCountryCodes
            .map((code) => regionNames?.of(code) ?? code)
            .join(', ') || null
      : (offices[0] ?? null);

  return {
    breadcrumbs: buildJobBreadcrumbs(job, language, labels).map((crumb) => ({
      name: crumb.name,
      href: crumb.path,
    })),
    breadcrumbAriaLabel: copy.breadcrumbAriaLabel,

    title: job.title,
    companyName: company?.name ?? null,
    companyLogoUrl: company?.logoUrl ?? null,
    companyAvatarName: company?.name ?? job.title,
    sector: job.categories[0]?.name ?? null,
    locationLabel: location,
    workplaceLabel: job.remoteOption
      ? fieldLabel(language, job.remoteOption, labels)
      : null,
    employmentTypeLabel: job.employmentType
      ? fieldLabel(language, job.employmentType, labels)
      : null,
    seniorityLabel: job.seniority
      ? fieldLabel(language, job.seniority, labels)
      : null,
    salaryLabel,
    publishedLabel: published ? copy.posted(published) : null,
    canonicalUrl: job.links?.public ?? null,
    detailHref:
      company?.slug && job.slug ? jobDetailPath(company.slug, job.slug) : null,

    descriptionHtml: job.description ?? null,
    noDescriptionText: copy.noDescriptionText,
    facts,
    categoryChips: job.categories.map((c) => ({
      key: c.slug,
      name: c.name,
      href: jobsCategoryPath(c.slug),
    })),
    skillChips: job.skills.map((s) => ({
      key: s.slug,
      name: s.name,
      href: jobsSkillPath(s.slug),
    })),
    categoriesHeading: copy.categoriesHeading,
    skillsHeading: copy.skillsHeading,
    customFields: customFieldVms,
    additionalDetailsHeading: copy.additionalDetailsHeading,
    company: companyVm,

    similar: similar.map((s) => ({
      id: s.id,
      title: s.title,
      companySlug: s.company?.slug ?? null,
      jobSlug: s.slug ?? null,
      meta:
        [
          s.company?.name,
          formatSalaryRange(
            language,
            s.salaryMin,
            s.salaryMax,
            s.salaryTimeframe,
            s.salaryCurrency,
          ),
        ]
          .filter(Boolean)
          .join(' · ') || null,
    })),
    similarJobsHeading: copy.similarJobsHeading,
  };
}
