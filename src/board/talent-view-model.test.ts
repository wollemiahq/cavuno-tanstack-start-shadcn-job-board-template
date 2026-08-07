import { describe, expect, it } from 'vitest';

import {
  resolveTalentDetailCta,
  toTalentCardVM,
  toTalentProfileVM,
} from './talent-view-model';

import type { TalentDirectoryEntry, TalentProfile } from '@cavuno/board';

const labels = {
  anonymousCandidate: 'Anonymous candidate',
  experienceHeading: 'Experience',
  educationHeading: 'Education',
  skillsHeading: 'Skills',
  languagesHeading: 'Languages',
  present: 'Aujourd’hui',
  viewProfile: 'View profile',
  jobSearchStatuses: {
    actively_looking: 'Actively looking',
    open_to_offers: 'Open to offers',
    not_looking: 'Not looking',
  },
  employmentTypes: {
    full_time: 'Full time',
  },
  locationTypes: {
    hybrid: 'Hybrid',
  },
  foundVia: {
    referral: 'Found via referral',
  },
  languageProficiencies: {
    fluent: 'Fluent',
  },
};

const directoryEntry = {
  object: 'talent_directory_entry',
  handle: 'ada-lovelace',
  displayName: 'Ada Lovelace',
  headline: 'Computing pioneer',
  location: 'London, United Kingdom',
  avatarUrl: 'https://cdn.example/ada.jpg',
  summary: 'I translate ambitious ideas into working systems.',
  bio: 'I translate ambitious ideas into working systems.',
  jobSearchStatus: 'open_to_offers',
  skills: ['Mathematics', 'Analytical engines'],
  experiences: [
    {
      title: 'Analytical engineer',
      companyName: 'Analytical Engines',
      startDate: '2022-01',
      endDate: null,
    },
  ],
  education: [
    {
      institutionName: 'University of London',
      startDate: '2018-09',
      endDate: '2021-06',
    },
  ],
} satisfies TalentDirectoryEntry;

const profile = {
  object: 'talent_profile',
  handle: 'ada-lovelace',
  displayName: 'Ada Lovelace',
  headline: 'Computing pioneer',
  location: 'London, United Kingdom',
  bio: 'I translate ambitious ideas into working systems.',
  avatarUrl: 'https://cdn.example/ada.jpg',
  jobSearchStatus: 'open_to_offers',
  experiences: [
    {
      title: 'Analytical engineer',
      companyName: 'Analytical Engines',
      companyUrl: 'analytical.example',
      companyLogoUrl: 'https://logos.example/acme.png',
      location: 'London, United Kingdom',
      employmentType: 'full_time',
      locationType: 'hybrid',
      foundVia: 'referral',
      startDate: '2022-01',
      endDate: null,
      description: 'Designed the first general-purpose computing programs.',
      experienceSkills: ['TypeScript', 'Mathematics'],
    },
  ],
  education: [
    {
      institutionName: 'University of London',
      institutionUrl: 'university.example',
      institutionLogoUrl: 'https://logos.example/mit.png',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Mathematics',
      grade: 'First class honours',
      activitiesAndSocieties: 'Analytical Society',
      startDate: '2018-09',
      endDate: '2021-06',
      description: 'Studied mathematical foundations of computation.',
    },
  ],
  skills: [
    { name: 'TypeScript', jobSkillId: 'skill-typescript' },
    { name: 'Mathematics', jobSkillId: null },
  ],
  languages: [{ name: 'English', proficiency: 'fluent' }],
} satisfies TalentProfile;

describe('talent view models', () => {
  it('maps a handle-backed directory entry to one canonical, localized result card', () => {
    expect(toTalentCardVM(directoryEntry, labels)).toEqual({
      handle: 'ada-lovelace',
      detailHref: '/p/ada-lovelace',
      displayName: 'Ada Lovelace',
      avatarUrl: 'https://cdn.example/ada.jpg',
      avatarName: 'Ada Lovelace',
      headline: 'Computing pioneer',
      location: 'London, United Kingdom',
      jobSearchStatusLabel: 'Open to offers',
      skills: ['Mathematics', 'Analytical engines'],
    });
  });

  it('keeps a handle-less directory entry visible without inventing a profile link', () => {
    const vm = toTalentCardVM(
      {
        ...directoryEntry,
        handle: null,
        displayName: 'Private candidate',
        avatarUrl: null,
      },
      labels,
    );

    expect(vm.handle).toBeNull();
    expect(vm.detailHref).toBeNull();
    expect(vm.displayName).toBe('Private candidate');
    expect(vm.avatarName).toBe('Private candidate');
    expect(vm.avatarUrl).toBeNull();
  });

  it('maps every supported rich-profile field and formats month ranges for the board locale', () => {
    const vm = toTalentProfileVM(profile, 'fr', labels);

    expect(vm.jobSearchStatusLabel).toBe('Open to offers');
    expect(vm.experiences).toEqual([
      {
        key: 'analytical-engineer-analytical-engines-2022-01',
        title: 'Analytical engineer',
        companyName: 'Analytical Engines',
        companyHref: 'https://analytical.example',
        // The public TalentProfile shape carries no company logo yet — the
        // mapper resolves it to null and the profile renders the initials
        // fallback (platform follow-up documented on toTalentProfileVM).
        companyLogoUrl: 'https://logos.example/acme.png',
        dateRangeLabel: 'janv. 2022 – Aujourd’hui',
        location: 'London, United Kingdom',
        employmentTypeLabel: 'Full time',
        locationTypeLabel: 'Hybrid',
        foundViaLabel: 'Found via referral',
        description: 'Designed the first general-purpose computing programs.',
        skills: ['TypeScript', 'Mathematics'],
      },
    ]);
    expect(vm.education).toEqual([
      {
        key: 'university-of-london-2018-09',
        institutionName: 'University of London',
        institutionHref: 'https://university.example',
        institutionLogoUrl: 'https://logos.example/mit.png',
        qualificationLabel: 'Bachelor of Science, Mathematics',
        grade: 'First class honours',
        activitiesAndSocieties: 'Analytical Society',
        dateRangeLabel: 'sept. 2018 – juin 2021',
        description: 'Studied mathematical foundations of computation.',
      },
    ]);
    expect(vm.skills).toEqual(['TypeScript', 'Mathematics']);
    expect(vm.languages).toEqual([
      { key: 'english', name: 'English', proficiencyLabel: 'Fluent' },
    ]);
  });

  it('omits absent optional values and unknown enum copy instead of exposing wire values', () => {
    const vm = toTalentProfileVM(
      {
        ...profile,
        headline: null,
        location: null,
        bio: null,
        avatarUrl: null,
        jobSearchStatus: 'future_status',
        experiences: [
          {
            ...profile.experiences[0],
            companyUrl: null,
            location: null,
            employmentType: 'future_employment_type',
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
        languages: [{ name: 'Esperanto', proficiency: 'future_proficiency' }],
      },
      'fr',
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
      { key: 'esperanto', name: 'Esperanto', proficiencyLabel: null },
    ]);
  });

  it('passes the serializer-resolved company and institution logos through', () => {
    const vm = toTalentProfileVM(profile, 'fr', labels);

    expect(vm.experiences[0]!.companyLogoUrl).toBe(
      'https://logos.example/acme.png',
    );
    expect(vm.education[0]!.institutionLogoUrl).toBe(
      'https://logos.example/mit.png',
    );
  });
});

describe('resolveTalentDetailCta', () => {
  const base = {
    detailHref: '/p/ada-lovelace',
    signInHref: '/auth/sign-in?returnTo=%2Ftalent',
    pricingHref: '/employers',
    labels: { message: 'Message', viewProfile: 'View profile' },
    showViewProfile: true,
  };

  it('routes an anonymous viewer to sign-in and keeps the profile link', () => {
    expect(
      resolveTalentDetailCta({ ...base, viewer: { kind: 'anonymous' } }),
    ).toEqual({
      message: { label: 'Message', href: '/auth/sign-in?returnTo=%2Ftalent' },
      viewProfile: { label: 'View profile', href: '/p/ada-lovelace' },
    });
  });

  it('gives a candidate viewer no Message CTA (candidates cannot cold-message candidates)', () => {
    expect(
      resolveTalentDetailCta({ ...base, viewer: { kind: 'candidate' } }),
    ).toEqual({
      message: null,
      viewProfile: { label: 'View profile', href: '/p/ada-lovelace' },
    });
  });

  it('routes an employer without talent access to pricing', () => {
    expect(
      resolveTalentDetailCta({
        ...base,
        viewer: { kind: 'employer', hasTalentAccess: false },
      }),
    ).toEqual({
      message: { label: 'Message', href: '/employers' },
      viewProfile: { label: 'View profile', href: '/p/ada-lovelace' },
    });
  });

  it('hands an employer with access to the canonical profile and drops the duplicate link', () => {
    expect(
      resolveTalentDetailCta({
        ...base,
        viewer: { kind: 'employer', hasTalentAccess: true },
      }),
    ).toEqual({
      message: { label: 'Message', href: '/p/ada-lovelace' },
      viewProfile: null,
    });
  });

  it('omits the View profile link on the canonical profile surface itself', () => {
    expect(
      resolveTalentDetailCta({
        ...base,
        viewer: { kind: 'anonymous' },
        showViewProfile: false,
      }),
    ).toEqual({
      message: { label: 'Message', href: '/auth/sign-in?returnTo=%2Ftalent' },
      viewProfile: null,
    });
  });

  it('renders no Message for an access-holding employer when the handle is missing', () => {
    expect(
      resolveTalentDetailCta({
        ...base,
        detailHref: null,
        viewer: { kind: 'employer', hasTalentAccess: true },
      }),
    ).toEqual({ message: null, viewProfile: null });
  });

  it.each([
    { name: 'anonymous', viewer: { kind: 'anonymous' as const } },
    {
      name: 'employer with access',
      viewer: { kind: 'employer' as const, hasTalentAccess: true },
    },
    {
      name: 'employer without access',
      viewer: { kind: 'employer' as const, hasTalentAccess: false },
    },
  ])(
    'drops the Message CTA for a $name viewer when messaging is off, keeping the profile link',
    ({ viewer }) => {
      expect(
        resolveTalentDetailCta({ ...base, viewer, messagingEnabled: false }),
      ).toEqual({
        message: null,
        viewProfile: { label: 'View profile', href: '/p/ada-lovelace' },
      });
    },
  );
});
