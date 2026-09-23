import { describe, expect, it } from 'vitest';

import {
  profileCustomFieldsBody,
  profileObjectReferencesBody,
} from './profile-field-writes';

import type { ProfileObjectReferences } from '@cavuno/board';

type Selection = ProfileObjectReferences['selections'][number];

function selection(
  fieldKey: string,
  recordId: string,
  overrides: Pick<Partial<Selection>, 'titleOverride' | 'values'> = {},
): Selection {
  return {
    fieldKey,
    fieldLabel: fieldKey,
    recordId,
    title: recordId,
    fields: [],
    attributes: {},
    valueDefinitions: [],
    entryDefinitions: [],
    values: {},
    entries: [],
    ...overrides,
  };
}

describe('profileCustomFieldsBody', () => {
  it('sends only the changed rendered keys, null for a cleared answer', () => {
    expect(
      profileCustomFieldsBody(
        ['tier', 'founded', 'motto', 'tags'],
        { tier: 'gold', founded: 2018, motto: '', tags: ['a', 'b'] },
        { tier: 'silver', founded: 2018, motto: 'Onward', tags: ['a', 'b'] },
      ),
    ).toEqual({ tier: 'gold', motto: null });
  });

  it('sends nothing when nothing changed, and never a key the form does not render', () => {
    expect(
      profileCustomFieldsBody(
        ['tier'],
        { tier: 'gold', hidden: 'x' },
        { tier: 'gold' },
      ),
    ).toBeNull();
  });
});

describe('profileObjectReferencesBody', () => {
  it('sends nothing when no rendered field changed', () => {
    expect(
      profileObjectReferencesBody(
        ['benefits'],
        { benefits: [{ id: 'pto', name: 'PTO' }] },
        [selection('benefits', 'pto')],
      ),
    ).toBeNull();
  });

  it('replaces the set, keeping hidden fields and each kept entry’s details and wording', () => {
    const stored = [
      selection('certifications', 'cert-1', { values: { year: 2020 } }),
      selection('benefits', 'pto', {
        titleOverride: 'Unlimited PTO',
        values: { days: 30 },
      }),
      selection('benefits', 'gym'),
    ];

    expect(
      profileObjectReferencesBody(
        ['benefits'],
        {
          benefits: [
            { id: 'pto', name: 'Unlimited PTO' },
            { id: 'pension', name: 'Pension' },
          ],
        },
        stored,
      ),
    ).toEqual({
      selections: [
        {
          fieldKey: 'certifications',
          recordId: 'cert-1',
          values: { year: 2020 },
          entries: [],
        },
        {
          fieldKey: 'benefits',
          recordId: 'pto',
          values: { days: 30 },
          entries: [],
          titleOverride: 'Unlimited PTO',
        },
        { fieldKey: 'benefits', recordId: 'pension' },
      ],
    });
  });
});
