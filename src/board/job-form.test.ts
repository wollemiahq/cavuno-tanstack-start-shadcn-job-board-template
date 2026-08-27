import { describe, expect, it } from 'vitest';

import { resolveJobForm } from './job-form';

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
