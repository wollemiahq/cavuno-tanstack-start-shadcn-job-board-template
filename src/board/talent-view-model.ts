import { normalizeWebsiteUrl } from "@cavuno/board/seo";

import type { TalentDirectoryEntry, TalentProfile } from "@cavuno/board";

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
  return value ? labels[value] ?? null : null;
}

function stableKey(...parts: Array<string | null>) {
  return parts
    .filter((part): part is string => Boolean(part))
    .join("-")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatMonth(value: string, language: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(language, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
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

export function toTalentProfileVM(
  profile: TalentProfile,
  language: string,
  labels: TalentViewModelLabels,
): TalentProfileVM {
  const card = toTalentCardVM(
    {
      ...profile,
      object: "talent_directory_entry",
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
      companyHref: normalizeWebsiteUrl(experience.companyUrl ?? ""),
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
      institutionHref: normalizeWebsiteUrl(education.institutionUrl ?? ""),
      qualificationLabel:
        [education.degree, education.fieldOfStudy].filter(Boolean).join(", ") ||
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
