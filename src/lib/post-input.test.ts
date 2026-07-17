import { describe, expect, it } from 'vitest';

import {
  remotePermitsSubmission,
  toCreateJobPostingInput,
  type JobPostingFormInput,
} from './post-form';

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
  it('maps region/group selections to their canonical permit entries', () => {
    expect(
      remotePermitsSubmission(
        [
          { type: 'custom', value: 'EU', label: 'European Union' },
          { type: 'world_region', value: 'EMEA', label: 'EMEA' },
        ],
        'Worldwide',
      ),
    ).toEqual({
      remoteWorkingPermits: [
        { type: 'custom', value: 'EU', label: 'European Union' },
        { type: 'world_region', value: 'EMEA', label: 'EMEA' },
      ],
    });
  });

  it('carries top-level codes only when every selection is a country', () => {
    expect(
      remotePermitsSubmission(
        [
          { type: 'country', value: 'DE', label: 'Germany' },
          { type: 'country', value: 'CH', label: 'Switzerland' },
        ],
        'Worldwide',
      ),
    ).toEqual({
      remoteWorkingPermits: [
        { type: 'country', value: 'DE', label: 'Germany' },
        { type: 'country', value: 'CH', label: 'Switzerland' },
      ],
      remoteWorkPermitCountryCodes: ['DE', 'CH'],
    });

    // Mixed group + country: the client cannot expand the group, so the
    // server derives the codes from the permits alone.
    expect(
      remotePermitsSubmission(
        [
          { type: 'custom', value: 'EU', label: 'European Union' },
          { type: 'country', value: 'CH', label: 'Switzerland' },
        ],
        'Worldwide',
      ).remoteWorkPermitCountryCodes,
    ).toBeUndefined();
  });

  it('means worldwide when nothing is selected', () => {
    expect(remotePermitsSubmission([], 'Worldwide')).toEqual({
      remoteWorkingPermits: [
        { type: 'worldwide', value: 'worldwide', label: 'Worldwide' },
      ],
    });
  });
});
