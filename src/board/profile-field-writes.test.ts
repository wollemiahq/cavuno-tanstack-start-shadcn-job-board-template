import { describe, expect, it } from 'vitest';

import { parseProfileFieldViolations } from './profile-field-violations';
import {
  initialProfileSelections,
  missingSelectionDetail,
  newEntryKey,
  profileCustomFieldsBody,
  profileObjectReferencesBody,
  withPickedChoices,
  withUnsetRequiredBooleans,
  type ProfileSelection,
} from './profile-field-writes';

import type { ProfileObjectReferences } from '@cavuno/board';

type Selection = ProfileObjectReferences['selections'][number];
type Definition = ProfileObjectReferences['definitions'][number];
type Detail = NonNullable<Definition['valueDefinitions']>[number];

function definition(
  key: string,
  editableByOwner = true,
  details: Pick<Definition, 'valueDefinitions' | 'entryDefinitions'> = {},
): Definition {
  return {
    key,
    label: key,
    typeId: `type-${key}`,
    multiple: true,
    visibility: 'public',
    editableByOwner,
    allowOverrides: true,
    ...details,
  };
}

function detail(key: string, overrides: Partial<Detail> = {}): Detail {
  return {
    key,
    label: key,
    type: 'short_text',
    required: false,
    visibility: 'public',
    editableByOwner: true,
    ...overrides,
  };
}

function chosen(
  id: string,
  overrides: Partial<ProfileSelection> = {},
): ProfileSelection {
  return { id, name: id, values: {}, entries: [], ...overrides };
}

function selection(
  fieldKey: string,
  recordId: string,
  overrides: Pick<
    Partial<Selection>,
    'titleOverride' | 'values' | 'entries'
  > = {},
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
        initialProfileSelections([selection('benefits', 'pto')]),
        [selection('benefits', 'pto')],
        [definition('benefits')],
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
            chosen('pto', { values: { days: 30 } }),
            chosen('pension'),
          ],
        },
        stored,
        [definition('certifications'), definition('benefits')],
      ),
    ).toEqual({
      selections: [
        {
          fieldKey: 'certifications',
          recordId: 'cert-1',
          values: { year: 2020 },
        },
        {
          fieldKey: 'benefits',
          recordId: 'pto',
          values: { days: 30 },
          titleOverride: 'Unlimited PTO',
        },
        { fieldKey: 'benefits', recordId: 'pension' },
      ],
    });
  });

  it('never resends a selection of a field the owner may not edit', () => {
    const stored = [
      selection('accreditations', 'acc-1'),
      selection('retired', 'old-1'),
      selection('benefits', 'pto'),
    ];

    expect(
      profileObjectReferencesBody(
        ['benefits'],
        { benefits: [chosen('gym')] },
        stored,
        [definition('accreditations', false), definition('benefits')],
      ),
    ).toEqual({ selections: [{ fieldKey: 'benefits', recordId: 'gym' }] });
  });
});

describe('collection details', () => {
  const cards = definition('cards', true, {
    valueDefinitions: [
      detail('colour', {
        type: 'single_select',
        required: true,
        options: [{ key: 'blue', label: 'Blue' }],
      }),
      detail('wallet', { type: 'boolean', required: true }),
      detail('issuer', { editableByOwner: false }),
    ],
    entryDefinitions: [detail('number', { required: true })],
  });

  it('sends typed details and rows with their keys, empty answers left out and an unset required Yes/No as No', () => {
    const stored = [
      selection('cards', 'white', {
        values: { colour: 'blue', issuer: 'Board' },
        entries: [{ key: 'e1', values: { number: 'A-1' } }],
      }),
    ];
    const current = initialProfileSelections(stored);
    current.cards![0]!.values = { colour: 'blue', issuer: 'Board', note: '' };
    current.cards![0]!.entries.push({
      key: 'e2',
      values: { number: 'B-2' },
    });

    expect(
      profileObjectReferencesBody(['cards'], current, stored, [cards]),
    ).toEqual({
      selections: [
        {
          fieldKey: 'cards',
          recordId: 'white',
          values: { colour: 'blue', wallet: false, issuer: 'Board' },
          entries: [
            { key: 'e1', values: { number: 'A-1' } },
            { key: 'e2', values: { number: 'B-2' } },
          ],
        },
      ],
    });
  });

  it('counts an edited detail as a change, and keeps details across a new pick', () => {
    const stored = [
      selection('cards', 'white', { values: { colour: 'blue' } }),
    ];
    const current = initialProfileSelections(stored);
    expect(
      profileObjectReferencesBody(['cards'], current, stored, [cards]),
    ).toBeNull();

    const picked = withPickedChoices(current.cards!, [
      { id: 'white', name: 'White card' },
      { id: 'blue', name: 'Blue card' },
    ]);
    expect(picked).toEqual([
      expect.objectContaining({ id: 'white', values: { colour: 'blue' } }),
      chosen('blue', { name: 'Blue card' }),
    ]);
    expect(
      profileObjectReferencesBody(['cards'], { cards: picked }, stored, [cards])
        ?.selections,
    ).toHaveLength(2);
  });

  it('names the first required detail left empty, by its input id', () => {
    expect(
      missingSelectionDetail(cards, [
        chosen('white', {
          values: { colour: 'blue' },
          entries: [{ key: 'e1', values: {} }],
        }),
      ]),
    ).toEqual({
      id: 'details-cards-white-e1-number',
      definition: expect.objectContaining({ key: 'number' }),
    });
    // A required Yes/No and a board-managed detail are never missing.
    expect(
      missingSelectionDetail(cards, [
        chosen('white', { values: { colour: 'blue' } }),
      ]),
    ).toBeNull();
  });

  it('makes row keys the API accepts', () => {
    const keys = new Set([newEntryKey(), newEntryKey()]);
    expect(keys.size).toBe(2);
    for (const key of keys)
      expect(key).toMatch(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
  });

  it('fills unset required Yes/No answers as No', () => {
    expect(
      withUnsetRequiredBooleans(
        [
          { key: 'abroad', type: 'boolean', required: true },
          { key: 'optional', type: 'boolean', required: false },
          { key: 'answered', type: 'boolean', required: true },
        ],
        { answered: true },
      ),
    ).toEqual({ abroad: false, answered: true });
  });
});

describe('parseProfileFieldViolations', () => {
  it('reads each refused field and drops anything off the documented shape', () => {
    expect(
      parseProfileFieldViolations({
        violations: [
          { fieldKey: 'colour', code: 'custom_field_required', message: 'x' },
          { code: 'custom_field_required' },
          null,
        ],
      }),
    ).toEqual([
      { fieldKey: 'colour', code: 'custom_field_required', message: 'x' },
    ]);
    expect(parseProfileFieldViolations(undefined)).toEqual([]);
  });
});
