import { describe, expect, it } from "vitest";

import type { TalentDirectoryEntry, TalentProfile } from "@cavuno/board";

import { toTalentCardVM, toTalentProfileVM } from "./talent-view-model";

const labels = {
  anonymousCandidate: "Anonymous candidate",
  experienceHeading: "Experience",
  educationHeading: "Education",
  skillsHeading: "Skills",
  languagesHeading: "Languages",
  present: "Aujourd’hui",
  viewProfile: "View profile",
  jobSearchStatuses: {
    actively_looking: "Actively looking",
    open_to_offers: "Open to offers",
    not_looking: "Not looking",
  },
  employmentTypes: {
    full_time: "Full time",
  },
  locationTypes: {
    hybrid: "Hybrid",
  },
  foundVia: {
    referral: "Found via referral",
  },
  languageProficiencies: {
    fluent: "Fluent",
  },
};

const directoryEntry = {
  object: "talent_directory_entry",
  handle: "ada-lovelace",
  displayName: "Ada Lovelace",
  headline: "Computing pioneer",
  location: "London, United Kingdom",
  avatarUrl: "https://cdn.example/ada.jpg",
  bio: "I translate ambitious ideas into working systems.",
  jobSearchStatus: "open_to_offers",
  skills: ["Mathematics", "Analytical engines"],
  experiences: [
    {
      title: "Analytical engineer",
      companyName: "Analytical Engines",
      startDate: "2022-01",
      endDate: null,
    },
  ],
  education: [
    {
      institutionName: "University of London",
      startDate: "2018-09",
      endDate: "2021-06",
    },
  ],
} satisfies TalentDirectoryEntry;

const profile = {
  object: "talent_profile",
  handle: "ada-lovelace",
  displayName: "Ada Lovelace",
  headline: "Computing pioneer",
  location: "London, United Kingdom",
  bio: "I translate ambitious ideas into working systems.",
  avatarUrl: "https://cdn.example/ada.jpg",
  jobSearchStatus: "open_to_offers",
  experiences: [
    {
      title: "Analytical engineer",
      companyName: "Analytical Engines",
      companyUrl: "analytical.example",
      location: "London, United Kingdom",
      employmentType: "full_time",
      locationType: "hybrid",
      foundVia: "referral",
      startDate: "2022-01",
      endDate: null,
      description: "Designed the first general-purpose computing programs.",
      experienceSkills: ["TypeScript", "Mathematics"],
    },
  ],
  education: [
    {
      institutionName: "University of London",
      institutionUrl: "university.example",
      degree: "Bachelor of Science",
      fieldOfStudy: "Mathematics",
      grade: "First class honours",
      activitiesAndSocieties: "Analytical Society",
      startDate: "2018-09",
      endDate: "2021-06",
      description: "Studied mathematical foundations of computation.",
    },
  ],
  skills: [
    { name: "TypeScript", jobSkillId: "skill-typescript" },
    { name: "Mathematics", jobSkillId: null },
  ],
  languages: [{ name: "English", proficiency: "fluent" }],
} satisfies TalentProfile;

describe("talent view models", () => {
  it("maps a handle-backed directory entry to one canonical, localized result card", () => {
    expect(toTalentCardVM(directoryEntry, labels)).toEqual({
      handle: "ada-lovelace",
      detailHref: "/p/ada-lovelace",
      displayName: "Ada Lovelace",
      avatarUrl: "https://cdn.example/ada.jpg",
      avatarName: "Ada Lovelace",
      headline: "Computing pioneer",
      location: "London, United Kingdom",
      jobSearchStatusLabel: "Open to offers",
      skills: ["Mathematics", "Analytical engines"],
    });
  });

  it("keeps a handle-less directory entry visible without inventing a profile link", () => {
    const vm = toTalentCardVM(
      {
        ...directoryEntry,
        handle: null,
        displayName: "Private candidate",
        avatarUrl: null,
      },
      labels,
    );

    expect(vm.handle).toBeNull();
    expect(vm.detailHref).toBeNull();
    expect(vm.displayName).toBe("Private candidate");
    expect(vm.avatarName).toBe("Private candidate");
    expect(vm.avatarUrl).toBeNull();
  });

  it("maps every supported rich-profile field and formats month ranges for the board locale", () => {
    const vm = toTalentProfileVM(profile, "fr", labels);

    expect(vm.jobSearchStatusLabel).toBe("Open to offers");
    expect(vm.experiences).toEqual([
      {
        key: "analytical-engineer-analytical-engines-2022-01",
        title: "Analytical engineer",
        companyName: "Analytical Engines",
        companyHref: "https://analytical.example",
        dateRangeLabel: "janv. 2022 – Aujourd’hui",
        location: "London, United Kingdom",
        employmentTypeLabel: "Full time",
        locationTypeLabel: "Hybrid",
        foundViaLabel: "Found via referral",
        description: "Designed the first general-purpose computing programs.",
        skills: ["TypeScript", "Mathematics"],
      },
    ]);
    expect(vm.education).toEqual([
      {
        key: "university-of-london-2018-09",
        institutionName: "University of London",
        institutionHref: "https://university.example",
        qualificationLabel: "Bachelor of Science, Mathematics",
        grade: "First class honours",
        activitiesAndSocieties: "Analytical Society",
        dateRangeLabel: "sept. 2018 – juin 2021",
        description: "Studied mathematical foundations of computation.",
      },
    ]);
    expect(vm.skills).toEqual(["TypeScript", "Mathematics"]);
    expect(vm.languages).toEqual([
      { key: "english", name: "English", proficiencyLabel: "Fluent" },
    ]);
  });

  it("omits absent optional values and unknown enum copy instead of exposing wire values", () => {
    const vm = toTalentProfileVM(
      {
        ...profile,
        headline: null,
        location: null,
        bio: null,
        avatarUrl: null,
        jobSearchStatus: "future_status",
        experiences: [
          {
            ...profile.experiences[0],
            companyUrl: null,
            location: null,
            employmentType: "future_employment_type",
            locationType: null,
            foundVia: null,
            description: null,
            experienceSkills: [],
          },
        ],
        education: [
          {
            ...profile.education[0],
            institutionUrl: null,
            degree: null,
            fieldOfStudy: null,
            grade: null,
            activitiesAndSocieties: null,
            startDate: null,
            endDate: null,
            description: null,
          },
        ],
        languages: [{ name: "Esperanto", proficiency: "future_proficiency" }],
      },
      "fr",
      labels,
    );

    expect(vm.headline).toBeNull();
    expect(vm.location).toBeNull();
    expect(vm.bio).toBeNull();
    expect(vm.avatarUrl).toBeNull();
    expect(vm.jobSearchStatusLabel).toBeNull();
    expect(vm.experiences[0]).toMatchObject({
      companyHref: null,
      location: null,
      employmentTypeLabel: null,
      locationTypeLabel: null,
      foundViaLabel: null,
      description: null,
      skills: [],
    });
    expect(vm.education[0]).toMatchObject({
      institutionHref: null,
      qualificationLabel: null,
      grade: null,
      activitiesAndSocieties: null,
      dateRangeLabel: null,
      description: null,
    });
    expect(vm.languages).toEqual([
      { key: "esperanto", name: "Esperanto", proficiencyLabel: null },
    ]);
  });
});
