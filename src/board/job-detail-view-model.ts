/**
 * Job detail VIEW-MODEL — the Layer-1b seam for the job-detail block.
 * `toJobDetailVM` is the only place SDK wire types,
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
  countryOptions,
  fieldLabel,
  formatPublishedRelativeDate,
  formatSalaryRange,
  resolveCustomFieldDisplay,
  type BoardLabelOverrides,
} from '@cavuno/board/format';
import { buildJobBreadcrumbs } from '@cavuno/board/format';
import {
  companyPath,
  jobDetailPath,
  jobsCategoryPath,
  jobsSkillPath,
} from '@cavuno/board/paths';

import { jobDetailCopy } from '@/copy-groups/job-detail';
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
  const copy = jobDetailCopy(language, labels);
  const company = job.company;

  // Every emitted slug resolves — the platform guarantees it (ADR-0099), so
  // chips link directly with no resolve round trip and no filtering.
  const taxonomyChip = (
    type: 'category' | 'skill',
    term: { slug: string; name: string },
  ): JobDetailChipVM => {
    return {
      key: term.slug,
      name: term.name,
      href:
        type === 'skill'
          ? jobsSkillPath(term.slug)
          : jobsCategoryPath(term.slug),
    };
  };

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
  // Country display-name → ISO code, so a place-hierarchy country renders the
  // way the card's server label does ("United States" → "US", "United
  // Kingdom" → "GB"). `countryOptions` is the SDK's canonical, board-language
  // country lexicon.
  const countryNameToCode = new Map(
    countryOptions(language).map((option) => [option.name, option.code]),
  );
  // The list card resolves its location from the API's pre-computed
  // `locationLabel`, which the full job payload does NOT carry. When a job has
  // no geocoded office, reconstruct the same place string from
  // `placeHierarchy` (broad→narrow: country, region, city) — otherwise a job
  // whose location lives only in the place taxonomy shows "Location not
  // specified" on the detail page while its card shows the place.
  const placeHierarchyLabel =
    job.placeHierarchy
      .map((place) => countryNameToCode.get(place.name) ?? place.name)
      .filter(Boolean)
      .reverse()
      .join(', ') || null;
  // Remote permit ISO codes → country names (card-mapper parity).
  const remoteScopeLabel =
    job.remoteWorkPermitCountryCodes
      .map((code) => regionNames?.of(code) ?? code)
      .filter(Boolean)
      .join(', ') || null;
  const location =
    job.remoteOption === 'remote'
      ? // A remote job's location is its scope: the constrained permit
        // countries when constrained, else Worldwide. `remoteWorldwide` is only
        // true for an explicit single worldwide selection, so an unconstrained
        // remote job (no permits) also resolves to Worldwide — never
        // "unspecified", matching the card's "Worldwide".
        (remoteScopeLabel ?? copy.worldwideLabel)
      : (offices[0] ?? placeHierarchyLabel);

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
    categoryChips: job.categories.map((c) => taxonomyChip('category', c)),
    skillChips: job.skills.map((s) => taxonomyChip('skill', s)),
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
