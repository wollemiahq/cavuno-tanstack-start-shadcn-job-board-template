import { normalizeWebsiteUrl } from '@cavuno/board/seo';

import type { TalentDirectoryEntry, TalentProfile } from '@cavuno/board';

export interface TalentViewModelLabels {
  anonymousCandidate: string;
  experienceHeading: string;
  educationHeading: string;
  skillsHeading: string;
  languagesHeading: string;
  present: string;
  viewProfile: string;
  jobSearchStatuses: Readonly<Record<string, string>>;
  employmentTypes: Readonly<Record<string, string>>;
  locationTypes: Readonly<Record<string, string>>;
  foundVia: Readonly<Record<string, string>>;
  languageProficiencies: Readonly<Record<string, string>>;
}

export interface TalentCardVM {
  handle: string | null;
  detailHref: string | null;
  displayName: string;
  avatarUrl: string | null;
  avatarName: string;
  headline: string | null;
  location: string | null;
  jobSearchStatusLabel: string | null;
  skills: string[];
}

export interface TalentExperienceVM {
  key: string;
  title: string;
  companyName: string;
  companyHref: string | null;
  /**
   * Company mark for the entry (logo when present, initials fallback
   * otherwise). The public `TalentProfile.experiences` shape does not yet
   * carry a logo URL, so this resolves to `null` today — see the platform
   * follow-up noted on `toTalentProfileVM`. Resolving it here keeps the
   * component ready for the field with a single mapper change.
   */
  companyLogoUrl: string | null;
  dateRangeLabel: string;
  location: string | null;
  employmentTypeLabel: string | null;
  locationTypeLabel: string | null;
  foundViaLabel: string | null;
  description: string | null;
  skills: string[];
}

export interface TalentEducationVM {
  key: string;
  institutionName: string;
  institutionHref: string | null;
  /** Institution mark; `null` today for the same reason as `companyLogoUrl`. */
  institutionLogoUrl: string | null;
  qualificationLabel: string | null;
  grade: string | null;
  activitiesAndSocieties: string | null;
  dateRangeLabel: string | null;
  description: string | null;
}

export interface TalentLanguageVM {
  key: string;
  name: string;
  proficiencyLabel: string | null;
}

export interface TalentProfileVM extends TalentCardVM {
  bio: string | null;
  experienceHeading: string;
  experiences: TalentExperienceVM[];
  educationHeading: string;
  education: TalentEducationVM[];
  skillsHeading: string;
  languagesHeading: string;
  languages: TalentLanguageVM[];
  viewProfileLabel: string;
}

function profilePath(handle: string | null) {
  return handle ? `/p/${encodeURIComponent(handle)}` : null;
}

function enumLabel(
  value: string | null,
  labels: Readonly<Record<string, string>>,
) {
  return value ? (labels[value] ?? null) : null;
}

function stableKey(...parts: Array<string | null>) {
  return parts
    .filter((part): part is string => Boolean(part))
    .join('-')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatMonth(value: string, language: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(language, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatMonthRange(
  startDate: string | null,
  endDate: string | null,
  language: string,
  presentLabel: string,
) {
  if (!startDate && !endDate) return null;
  if (!startDate && endDate) return formatMonth(endDate, language);

  return `${formatMonth(startDate!, language)} – ${
    endDate ? formatMonth(endDate, language) : presentLabel
  }`;
}

export function toTalentCardVM(
  candidate: TalentDirectoryEntry,
  labels: TalentViewModelLabels,
): TalentCardVM {
  const displayName = candidate.displayName ?? labels.anonymousCandidate;

  return {
    handle: candidate.handle,
    detailHref: profilePath(candidate.handle),
    displayName,
    avatarUrl: candidate.avatarUrl,
    avatarName: displayName,
    headline: candidate.headline,
    location: candidate.location,
    jobSearchStatusLabel: enumLabel(
      candidate.jobSearchStatus,
      labels.jobSearchStatuses,
    ),
    skills: candidate.skills,
  };
}

/**
 * PLATFORM FOLLOW-UP — talent entry logos. The public `TalentProfile`
 * serializer (`@cavuno/board` schema `TalentProfile`) exposes
 * `experiences[].companyUrl` and `education[].institutionUrl` but no logo
 * field (`companyLogoUrl` / `institutionLogoUrl`), unlike the company
 * serializer which does carry `logoUrl`. Until the API adds those fields the
 * mapper resolves them to `null` and the profile renders the initials
 * fallback. When the field lands, resolve it from `experience.companyLogoUrl`
 * / `education.institutionLogoUrl` here — no component change required.
 */
export function toTalentProfileVM(
  profile: TalentProfile,
  language: string,
  labels: TalentViewModelLabels,
): TalentProfileVM {
  const card = toTalentCardVM(
    {
      ...profile,
      object: 'talent_directory_entry',
      skills: profile.skills.map((skill) => skill.name),
      experiences: profile.experiences,
      education: profile.education,
    },
    labels,
  );

  return {
    ...card,
    bio: profile.bio,
    experienceHeading: labels.experienceHeading,
    experiences: profile.experiences.map((experience) => ({
      key: stableKey(
        experience.title,
        experience.companyName,
        experience.startDate,
      ),
      title: experience.title,
      companyName: experience.companyName,
      companyHref: normalizeWebsiteUrl(experience.companyUrl ?? ''),
      companyLogoUrl: null,
      dateRangeLabel: formatMonthRange(
        experience.startDate,
        experience.endDate,
        language,
        labels.present,
      )!,
      location: experience.location,
      employmentTypeLabel: enumLabel(
        experience.employmentType,
        labels.employmentTypes,
      ),
      locationTypeLabel: enumLabel(
        experience.locationType,
        labels.locationTypes,
      ),
      foundViaLabel: enumLabel(experience.foundVia, labels.foundVia),
      description: experience.description,
      skills: experience.experienceSkills,
    })),
    educationHeading: labels.educationHeading,
    education: profile.education.map((education) => ({
      key: stableKey(education.institutionName, education.startDate),
      institutionName: education.institutionName,
      institutionHref: normalizeWebsiteUrl(education.institutionUrl ?? ''),
      institutionLogoUrl: null,
      qualificationLabel:
        [education.degree, education.fieldOfStudy].filter(Boolean).join(', ') ||
        null,
      grade: education.grade,
      activitiesAndSocieties: education.activitiesAndSocieties,
      dateRangeLabel: formatMonthRange(
        education.startDate,
        education.endDate,
        language,
        labels.present,
      ),
      description: education.description,
    })),
    skillsHeading: labels.skillsHeading,
    skills: profile.skills.map((skill) => skill.name),
    languagesHeading: labels.languagesHeading,
    languages: profile.languages.map((language) => ({
      key: stableKey(language.name),
      name: language.name,
      proficiencyLabel: enumLabel(
        language.proficiency,
        labels.languageProficiencies,
      ),
    })),
    viewProfileLabel: labels.viewProfile,
  };
}

/** The viewer looking at a talent detail surface, for CTA gating. */
export type TalentDetailViewer =
  | { kind: 'anonymous' }
  | { kind: 'candidate' }
  | { kind: 'employer'; hasTalentAccess: boolean };

export interface TalentDetailCtaLabels {
  message: string;
  viewProfile: string;
}

export interface TalentDetailCtaLink {
  label: string;
  href: string;
}

export interface TalentDetailCta {
  /** The emphasized action, or `null` when the viewer gets no Message CTA. */
  message: TalentDetailCtaLink | null;
  /** The subdued canonical-profile link, or `null` when it would duplicate
   *  the primary action or the surface already is the canonical profile. */
  viewProfile: TalentDetailCtaLink | null;
}

/**
 * Resolve the talent-detail primary/secondary CTA from the viewer's state.
 *
 * Gating matrix (a "Message" a candidate cannot cold-send is never shown):
 *  - anonymous               → Message routes to sign-in (`signInHref`).
 *  - candidate               → no Message (candidates can't cold-message
 *                              candidates); only the View-profile link.
 *  - employer, no access     → Message routes to pricing (`pricingHref`).
 *  - employer, has access    → Message routes to the canonical profile
 *                              (`detailHref`), where the conversation opens.
 *
 * NOTE: a live in-pane conversation start is not wired because the public
 * talent shapes expose only `handle`, never the `candidateBoardUserId` that
 * `board.me.conversations.start` requires — a platform follow-up. Until then
 * the employer-with-access action hands off to the canonical profile.
 */
export function resolveTalentDetailCta(input: {
  viewer: TalentDetailViewer;
  /** Canonical `/p/{handle}` link, or `null` when the handle is missing. */
  detailHref: string | null;
  signInHref: string;
  pricingHref: string;
  labels: TalentDetailCtaLabels;
  /** `false` when the surface already is the canonical profile page. */
  showViewProfile: boolean;
  /**
   * Board `features.messaging` (default-on). `false` ⇒ the whole messaging
   * surface is off, so no Message CTA is offered to anyone — only the
   * View-profile link remains.
   */
  messagingEnabled?: boolean;
}): TalentDetailCta {
  const { viewer, detailHref, labels } = input;
  const messagingEnabled = input.messagingEnabled ?? true;

  const viewProfile: TalentDetailCtaLink | null =
    input.showViewProfile && detailHref
      ? { label: labels.viewProfile, href: detailHref }
      : null;

  let message: TalentDetailCtaLink | null = null;
  if (!messagingEnabled) {
    // No messaging surface ⇒ no Message CTA; keep the profile link.
    return { message: null, viewProfile };
  }
  if (viewer.kind === 'anonymous') {
    message = { label: labels.message, href: input.signInHref };
  } else if (viewer.kind === 'employer') {
    message = viewer.hasTalentAccess
      ? detailHref
        ? { label: labels.message, href: detailHref }
        : null
      : { label: labels.message, href: input.pricingHref };
  }

  // Never render two controls pointing at the same place.
  return {
    message,
    viewProfile:
      message && viewProfile && message.href === viewProfile.href
        ? null
        : viewProfile,
  };
}
