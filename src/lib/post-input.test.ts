import { describe, expect, it } from 'vitest';

import { toCreateJobPostingInput, type JobPostingFormInput } from './post-form';

const posting: JobPostingFormInput = {
  companyName: 'Acme Studio',
  companyWebsite: 'https://acme.example',
  contactName: 'Ada Lovelace',
  contactEmail: 'ada@acme.example',
  title: 'Staff Product Designer',
  description: '<p>Lead product design.</p>',
  employmentType: 'full_time',
  remoteOption: 'remote',
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
        officeLocations: [],
        applicationUrl: 'https://acme.example/apply',
        salaryRangeEnabled: true,
        salaryMin: 140000,
        salaryMax: 180000,
        salaryCurrency: 'AUD',
        selectedPlan: 'plan-standard',
      },
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
