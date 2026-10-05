import { describe, expect, it } from 'vitest';

import {
  employmentTypeChoiceValue,
  employmentTypeChoices,
  employmentTypeFilterChoices,
  narrowOptions,
  resolveJobForm,
  resolveJobFormConstraints,
  parseJobFormViolations,
  type JobFormSource,
} from './job-form';

import { m } from '@/paraglide/messages';

describe('resolveJobForm', () => {
  it('defaults every field visible when the group is absent', () => {
    expect(resolveJobForm(undefined)).toEqual({
      salary: { visible: true },
      seniority: { visible: true },
      location: { visible: true },
      sponsorship: { visible: true },
    });
    expect(resolveJobForm({})).toEqual({
      salary: { visible: true },
      seniority: { visible: true },
      location: { visible: true },
      sponsorship: { visible: true },
    });
  });

  it('reads jobForm off a board-shaped object', () => {
    expect(
      resolveJobForm({
        jobForm: {
          salary: { visible: false },
          seniority: { visible: true },
          location: { visible: false },
          sponsorship: { visible: true },
        },
      }),
    ).toEqual({
      salary: { visible: false },
      seniority: { visible: true },
      location: { visible: false },
      sponsorship: { visible: true },
    });
  });

  it('accepts the jobForm group directly', () => {
    expect(
      resolveJobForm({
        salary: { visible: false },
        seniority: { visible: false },
        location: { visible: true },
        sponsorship: { visible: true },
      }),
    ).toEqual({
      salary: { visible: false },
      seniority: { visible: false },
      location: { visible: true },
      sponsorship: { visible: true },
    });
  });
});

describe('resolveJobFormConstraints', () => {
  it('is fully permissive for an absent or pre-4.10 payload', () => {
    // An over-strict fallback would block a legitimate posting; the server
    // still enforces the real constraint either way.
    for (const source of [undefined, null, {}, { jobForm: null }]) {
      const out = resolveJobFormConstraints(source);
      expect(out.salary.required).toBe(false);
      expect(out.salary.allowedCurrencies).toBeNull();
      expect(out.seniority.allowedOptions).toBeNull();
      expect(out.location.allowedCountries).toBeNull();
      expect(out.workArrangement.allowedOptions).toBeNull();
      expect(out.employmentType.allowedOptions).toBeNull();
    }
  });

  it('reads an empty allow-list as no restriction, never an empty picker', () => {
    const out = resolveJobFormConstraints({
      jobForm: {
        salary: { allowedCurrencies: [] },
        seniority: { allowedOptions: [] },
        location: { allowedCountries: [] },
        workArrangement: { allowedOptions: [] },
        employmentType: { allowedOptions: [] },
      },
    });
    expect(out.salary.allowedCurrencies).toBeNull();
    expect(out.seniority.allowedOptions).toBeNull();
    expect(out.location.allowedCountries).toBeNull();
    expect(out.workArrangement.allowedOptions).toBeNull();
    expect(out.employmentType.allowedOptions).toBeNull();
  });

  it('drops salary bounds when salary is optional', () => {
    // The API already does this; re-asserted so no payload can make the
    // form enforce a bound the server will not.
    const out = resolveJobFormConstraints({
      jobForm: { salary: { required: false, minBound: 1000, maxBound: 2000 } },
    });
    expect(out.salary.minBound).toBeNull();
    expect(out.salary.maxBound).toBeNull();
  });

  it('keeps salary bounds when salary is required', () => {
    const out = resolveJobFormConstraints({
      jobForm: { salary: { required: true, minBound: 1000, maxBound: 2000 } },
    });
    expect(out.salary).toMatchObject({
      required: true,
      minBound: 1000,
      maxBound: 2000,
    });
  });
});

describe('narrowOptions', () => {
  const all = ['remote', 'hybrid', 'on_site'] as const;

  it('leaves the list untouched when there is no restriction', () => {
    expect(narrowOptions(all, null)).toEqual(['remote', 'hybrid', 'on_site']);
  });

  it('narrows to the allow-list, preserving the form order', () => {
    expect(narrowOptions(all, ['on_site', 'remote'])).toEqual([
      'remote',
      'on_site',
    ]);
  });

  it('falls back to the full list when the allow-list overlaps nothing', () => {
    // An empty picker blocks every posting; an over-permissive one defers
    // to the server's 400.
    expect(narrowOptions(all, ['martian'])).toEqual([
      'remote',
      'hybrid',
      'on_site',
    ]);
  });
});

describe('parseJobFormViolations', () => {
  it('reads the documented violation shape off an error’s details', () => {
    expect(
      parseJobFormViolations({
        violations: [
          {
            code: 'custom_field_required',
            path: ['customFieldValues', 'team'],
            params: { label: 'Team' },
          },
          { code: 'salary_required', path: ['salaryMin'] },
        ],
      }),
    ).toEqual([
      {
        code: 'custom_field_required',
        path: ['customFieldValues', 'team'],
        params: {
          label: 'Team',
          min: undefined,
          max: undefined,
          countries: undefined,
        },
      },
      { code: 'salary_required', path: ['salaryMin'] },
    ]);
  });

  it('drops anything that does not match, instead of throwing', () => {
    expect(parseJobFormViolations(undefined)).toEqual([]);
    expect(parseJobFormViolations({ violations: 'nope' })).toEqual([]);
    expect(
      parseJobFormViolations({ violations: [{ code: 7 }, null, 'x'] }),
    ).toEqual([]);
  });
});

describe('employmentTypeChoices', () => {
  const casual = {
    key: 'casual',
    label: 'Casual',
    employmentType: 'part_time',
    offered: true,
  };
  const fifo = {
    key: 'fifo',
    label: 'Fly-in fly-out',
    employmentType: 'contract',
    offered: false,
  };
  const choicesFor = (
    employmentType: NonNullable<JobFormSource['employmentType']>,
  ) =>
    employmentTypeChoices(
      resolveJobFormConstraints({ jobForm: { employmentType } }).employmentType,
    );

  it('interleaves offered built-ins and custom types in the board order', () => {
    const { choices, pinned } = choicesFor({
      allowedOptions: ['volunteer', 'full_time'],
      customTypes: [casual, fifo],
      order: ['volunteer', 'casual', 'fifo', 'full_time'],
    });

    expect(choices).toEqual([
      {
        value: 'volunteer',
        employmentType: 'volunteer',
        customEmploymentType: null,
        label: m.label_employmentVolunteer(),
      },
      {
        value: 'custom:casual',
        employmentType: 'part_time',
        customEmploymentType: 'casual',
        label: 'Casual',
      },
      {
        value: 'full_time',
        employmentType: 'full_time',
        customEmploymentType: null,
        label: m.label_employmentFullTime(),
      },
    ]);
    expect(pinned).toBeNull();
  });

  it('offers only custom types when the board allows no built-in', () => {
    const { choices } = choicesFor({
      allowedOptions: [],
      customTypes: [casual, { ...fifo, offered: true }],
      order: ['fifo', 'casual'],
    });

    expect(choices.map(({ value }) => value)).toEqual([
      'custom:fifo',
      'custom:casual',
    ]);
  });

  it('pins the only choice so the form can collapse the field', () => {
    const { choices, pinned } = choicesFor({
      allowedOptions: [],
      customTypes: [casual, fifo],
      order: [],
    });

    expect(choices).toHaveLength(1);
    expect(pinned).toMatchObject({
      employmentType: 'part_time',
      customEmploymentType: 'casual',
    });
  });

  it('keeps the long-standing five built-ins for a pre-custom-type payload', () => {
    expect(
      employmentTypeChoices(
        resolveJobFormConstraints(undefined).employmentType,
      ).choices.map(({ value }) => value),
    ).toEqual([
      'full_time',
      'part_time',
      'contract',
      'internship',
      'temporary',
    ]);
  });

  it('limits the search filter to the listing vocabulary', () => {
    const choices = employmentTypeFilterChoices({
      jobForm: {
        employmentType: {
          allowedOptions: ['volunteer', 'contract'],
          customTypes: [casual, fifo],
          order: ['casual', 'volunteer', 'contract'],
        },
      },
    });

    expect(choices.map(({ value }) => value)).toEqual([
      'custom:casual',
      'contract',
    ]);
  });
});

describe('employmentTypeChoiceValue', () => {
  it("selects a job's custom type ahead of its built-in equivalent", () => {
    expect(
      employmentTypeChoiceValue({
        employmentType: 'part_time',
        customEmploymentType: { key: 'casual' },
      }),
    ).toBe('custom:casual');
    expect(
      employmentTypeChoiceValue({
        employmentType: 'contract',
        customEmploymentType: null,
      }),
    ).toBe('contract');
  });
});
