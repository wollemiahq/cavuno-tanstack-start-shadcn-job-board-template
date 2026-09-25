import { describe, expect, it } from 'vitest';

import {
  countCustomFieldFilters,
  customFieldFiltersToSearch,
  parseCustomFieldSearch,
  resolveCustomFieldFilters,
  toCustomFilterFields,
  withCustomFieldFilters,
  type CustomFilterField,
} from './custom-field-filters';

const workStyle: CustomFilterField = {
  kind: 'choice',
  key: 'work_style',
  label: 'Work style',
  options: [
    { value: 'async', label: 'Async-first' },
    { value: 'sync', label: 'Office hours' },
    { value: 'flexible', label: 'Flexible' },
  ],
};
const fourDayWeek: CustomFilterField = {
  kind: 'flag',
  key: 'four_day_week',
  label: 'Four-day week',
};

describe('toCustomFilterFields', () => {
  it('turns select and yes/no fields into controls in display order', () => {
    expect(
      toCustomFilterFields([
        {
          key: 'stage',
          label: 'Stage',
          type: 'single_select',
          options: [
            { key: 'seed', label: 'Seed' },
            { key: 'growth', label: 'Growth' },
          ],
        },
        { key: 'headcount', label: 'Headcount', type: 'number' },
        { key: 'tagline', label: 'Tagline', type: 'short_text' },
        { key: 'about', label: 'About', type: 'rich_text' },
        { key: 'founded', label: 'Founded', type: 'date' },
        { key: 'remote_ok', label: 'Remote friendly', type: 'boolean' },
        {
          key: 'perks',
          label: 'Perks',
          type: 'multi_select',
          options: [{ key: 'gym', label: 'Gym' }],
        },
      ]),
    ).toEqual([
      {
        kind: 'choice',
        key: 'stage',
        label: 'Stage',
        options: [
          { value: 'seed', label: 'Seed' },
          { value: 'growth', label: 'Growth' },
        ],
      },
      { kind: 'flag', key: 'remote_ok', label: 'Remote friendly' },
      {
        kind: 'choice',
        key: 'perks',
        label: 'Perks',
        options: [{ value: 'gym', label: 'Gym' }],
      },
    ]);
  });

  it('leaves out private fields and selects without options', () => {
    expect(
      toCustomFilterFields([
        {
          key: 'internal',
          label: 'Internal',
          type: 'boolean',
          visibility: 'private',
        },
        { key: 'empty', label: 'Empty', type: 'single_select', options: [] },
        {
          key: 'mentor',
          label: 'Mentor',
          type: 'boolean',
          visibility: 'public',
        },
      ]),
    ).toEqual([{ kind: 'flag', key: 'mentor', label: 'Mentor' }]);
    expect(toCustomFilterFields(undefined)).toEqual([]);
  });

  it('applies template labels over the authoring defaults', () => {
    const [field] = toCustomFilterFields(
      [
        {
          key: 'visa',
          label: 'Visa',
          type: 'single_select',
          options: [{ key: 'yes', label: 'Yes' }],
        },
      ],
      {
        field: () => 'Visumsponsoring',
        option: () => 'Ja',
      },
    );
    expect(field).toEqual({
      kind: 'choice',
      key: 'visa',
      label: 'Visumsponsoring',
      options: [{ value: 'yes', label: 'Ja' }],
    });
  });
});

describe('parseCustomFieldSearch', () => {
  it('keeps well-formed cf.* parameters and ignores everything else', () => {
    expect(
      parseCustomFieldSearch({
        q: 'design',
        page: 2,
        'cf.work_style': ' async , flexible,async ',
        'cf.four_day_week': true,
        'cf.bad key': 'x',
        'cf.': 'x',
        'cf.empty': ' , ',
        'cf.off': false,
        'cf.level': 3,
        'cf.repeat': ['a', 'b,c'],
      }),
    ).toEqual({
      'cf.work_style': 'async,flexible',
      'cf.four_day_week': true,
      'cf.level': '3',
      'cf.repeat': 'a,b,c',
    });
  });

  it('keeps at most ten values per parameter', () => {
    const values = Array.from({ length: 12 }, (_, index) => `v${index}`);
    expect(
      parseCustomFieldSearch({ 'cf.many': values.join(',') })['cf.many'],
    ).toBe(values.slice(0, 10).join(','));
  });
});

describe('resolveCustomFieldFilters', () => {
  it('builds OR-within, AND-across clauses in field order', () => {
    expect(
      resolveCustomFieldFilters([workStyle, fourDayWeek], {
        'cf.four_day_week': true,
        'cf.work_style': 'flexible,async',
      }),
    ).toEqual([
      { key: 'work_style', values: ['async', 'flexible'] },
      { key: 'four_day_week', values: [true] },
    ]);
  });

  it('drops unknown keys, stale options and wrong types', () => {
    expect(
      resolveCustomFieldFilters([workStyle, fourDayWeek], {
        'cf.retired_field': 'x',
        'cf.work_style': 'hybrid,sync',
        'cf.four_day_week': 'yes',
      }),
    ).toEqual([{ key: 'work_style', values: ['sync'] }]);
    expect(
      resolveCustomFieldFilters([workStyle], { 'cf.work_style': 'hybrid' }),
    ).toEqual([]);
  });

  it('accepts a checkbox value that arrives as the string "true"', () => {
    expect(
      resolveCustomFieldFilters([fourDayWeek], { 'cf.four_day_week': 'true' }),
    ).toEqual([{ key: 'four_day_week', values: [true] }]);
  });

  it('sends at most ten clauses', () => {
    const fields: CustomFilterField[] = Array.from(
      { length: 12 },
      (_, index) => ({ kind: 'flag', key: `flag_${index}`, label: 'Flag' }),
    );
    const search = Object.fromEntries(
      fields.map((field) => [`cf.${field.key}`, true] as const),
    );

    const clauses = resolveCustomFieldFilters(fields, search);

    expect(clauses).toHaveLength(10);
    expect(clauses.at(-1)).toEqual({ key: 'flag_9', values: [true] });
  });
});

describe('custom-field URL round trip', () => {
  it('serializes clauses to option keys and true', () => {
    expect(
      customFieldFiltersToSearch([
        { key: 'work_style', values: ['async', 'sync'] },
        { key: 'four_day_week', values: [true] },
      ]),
    ).toEqual({
      'cf.work_style': 'async,sync',
      'cf.four_day_week': true,
    });
  });

  it('replaces every existing cf.* parameter and keeps the rest', () => {
    expect(
      withCustomFieldFilters(
        { q: 'design', 'cf.old': 'a', 'cf.work_style': 'sync' },
        [{ key: 'work_style', values: ['async'] }],
      ),
    ).toEqual({
      q: 'design',
      'cf.old': undefined,
      'cf.work_style': 'async',
    });
  });

  it('counts one per selected option or ticked checkbox', () => {
    expect(
      countCustomFieldFilters([
        { key: 'work_style', values: ['async', 'sync'] },
        { key: 'four_day_week', values: [true] },
      ]),
    ).toBe(3);
  });
});
