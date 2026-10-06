import { describe, expect, it } from 'vitest';

import {
  employmentTypeChoiceValue,
  employmentTypeChoices,
} from './employment-type-choices';
import { resolveJobFormConstraints, type JobFormSource } from './job-form';

import { employmentTypeFilterChoices } from '@/lib/employment-type-filter';
import { m } from '@/paraglide/messages';

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
