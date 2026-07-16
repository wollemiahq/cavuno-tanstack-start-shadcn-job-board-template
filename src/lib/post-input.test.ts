import { describe, expect, it } from 'vitest';

import {
  remotePermitsSubmission,
  toCreateJobPostingInput,
  type JobPostingFormInput,
} from './post-form';

import type { RemotePermitTaxonomyEntry } from '@cavuno/board';

const posting: JobPostingFormInput = {
  companyName: 'Acme Studio',
  companyWebsite: 'https://acme.example',
  contactName: 'Ada Lovelace',
  contactEmail: 'ada@acme.example',
  title: 'Staff Product Designer',
  description: '<p>Lead product design.</p>',
  employmentType: 'full_time',
  remoteOption: 'remote',
  seniority: 'senior',
  officeLocations: [{ displayName: 'Berlin', countryCode: 'DE' }],
  remoteWorkingPermits: [{ type: 'country', value: 'DE', label: 'Germany' }],
  remoteWorkPermitCountryCodes: ['DE'],
  customFieldValues: { visa_support: true, stack: ['react', 'ros'] },
  applicationUrl: 'https://acme.example/apply',
  salaryMin: 140000,
  salaryMax: 180000,
  salaryCurrency: 'AUD',
  selectedPlan: 'plan-standard',
  logoUrl: 'https://cdn.example/logo.webp',
};

describe('toCreateJobPostingInput', () => {
  it('enables the salary range only when both bounds can be submitted together', () => {
    expect(toCreateJobPostingInput(posting)).toEqual({
      submission: {
        companyName: 'Acme Studio',
        companyWebsite: 'https://acme.example',
        contactName: 'Ada Lovelace',
        contactEmail: 'ada@acme.example',
        title: 'Staff Product Designer',
        description: '<p>Lead product design.</p>',
        employmentType: 'full_time',
        remoteOption: 'remote',
        seniority: 'senior',
        officeLocations: [{ displayName: 'Berlin', countryCode: 'DE' }],
        remoteWorkingPermits: [
          { type: 'country', value: 'DE', label: 'Germany' },
        ],
        customFieldValues: { visa_support: true, stack: ['react', 'ros'] },
        applicationUrl: 'https://acme.example/apply',
        salaryRangeEnabled: true,
        salaryMin: 140000,
        salaryMax: 180000,
        salaryCurrency: 'AUD',
        selectedPlan: 'plan-standard',
      },
      remoteWorkPermitCountryCodes: ['DE'],
      logoUrl: 'https://cdn.example/logo.webp',
    });

    expect(
      toCreateJobPostingInput({
        ...posting,
        salaryMax: undefined,
      }).submission,
    ).toMatchObject({
      salaryRangeEnabled: false,
      salaryMin: 140000,
      salaryMax: undefined,
      salaryCurrency: undefined,
    });
  });
});

describe('remotePermitsSubmission', () => {
  const permits = [
    { type: 'worldwide', value: 'worldwide', label: 'Worldwide' },
    { type: 'world_region', value: 'EMEA', label: 'EMEA' },
    { type: 'custom', value: 'EU', label: 'European Union' },
  ] as RemotePermitTaxonomyEntry[];

  it('maps a region/bloc scope to its single canonical permit entry', () => {
    expect(
      remotePermitsSubmission('custom:EU', [], permits, 'Worldwide'),
    ).toEqual({
      remoteWorkingPermits: [
        { type: 'custom', value: 'EU', label: 'European Union' },
      ],
    });
    expect(
      remotePermitsSubmission('world_region:EMEA', [], permits, 'Worldwide'),
    ).toEqual({
      remoteWorkingPermits: [
        { type: 'world_region', value: 'EMEA', label: 'EMEA' },
      ],
    });
  });

  it('maps hand-picked countries with the derived top-level codes', () => {
    expect(
      remotePermitsSubmission(
        'countries',
        [{ code: 'DE', name: 'Germany' }],
        permits,
        'Worldwide',
      ),
    ).toEqual({
      remoteWorkingPermits: [
        { type: 'country', value: 'DE', label: 'Germany' },
      ],
      remoteWorkPermitCountryCodes: ['DE'],
    });
  });

  it('degrades to worldwide instead of ever submitting an invalid permit', () => {
    const worldwide = {
      remoteWorkingPermits: [
        { type: 'worldwide', value: 'worldwide', label: 'Worldwide' },
      ],
    };
    expect(
      remotePermitsSubmission('worldwide', [], permits, 'Worldwide'),
    ).toEqual(worldwide);
    // Countries mode with nothing picked, a token missing from the taxonomy,
    // and a taxonomy that failed to load all fall back the same way.
    expect(
      remotePermitsSubmission('countries', [], permits, 'Worldwide'),
    ).toEqual(worldwide);
    expect(
      remotePermitsSubmission('custom:MENA', [], permits, 'Worldwide'),
    ).toEqual(worldwide);
    expect(remotePermitsSubmission('custom:EU', [], null, 'Worldwide')).toEqual(
      worldwide,
    );
  });
});
