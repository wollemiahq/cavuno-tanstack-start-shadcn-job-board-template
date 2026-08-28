import { describe, expect, it } from 'vitest';

import {
  narrowOptions,
  resolveJobForm,
  resolveJobFormConstraints,
} from './job-form';

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
