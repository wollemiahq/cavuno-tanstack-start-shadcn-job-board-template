import { describe, expect, it } from 'vitest';

import {
  collectionPresentation,
  companyDetailFields,
  jobDetailFields,
  scalarSizeClass,
  type DetailFieldFormat,
} from './detail-fields';

import type {
  BoardJobFormField,
  BoardProfileFormField,
  CustomFieldDefinition,
  PublicCompanyDetail,
  PublicJob,
} from '@cavuno/board';

const format: DetailFieldFormat = {
  locale: 'en',
  yesLabel: 'YES',
  noLabel: 'NO',
  galleryImageAlt: (label, index, count) => `${label} ${index}/${count}`,
  otherGroupLabel: 'OTHER',
};

type JobField = PublicJob['resolvedCollectionFields'][number];
type JobEntry = JobField['entries'][number];
type EntryField = JobEntry['fields'][number];
type Selection = PublicCompanyDetail['objectReferences'][number];
type ProfileCustom = Extract<
  BoardProfileFormField,
  { kind: 'custom' }
>['definition'];
type ProfileCollection = Extract<
  BoardProfileFormField,
  { kind: 'collection' }
>['definition'];

function media(name: string, url = `https://cdn.test/${name}`) {
  return { id: name, name, contentType: 'image/png', sizeBytes: 2048, url };
}

const logoField: EntryField = { key: 'logo', label: 'Logo', type: 'image' };

function jobEntry(overrides: Partial<JobEntry> = {}): JobEntry {
  return {
    id: 'rec-1',
    name: 'Entry',
    title: 'Entry',
    description: null,
    titleOverride: null,
    descriptionOverride: null,
    fields: [],
    values: {},
    ...overrides,
  };
}

function jobCustom(
  definition: CustomFieldDefinition,
  visible = true,
): BoardJobFormField {
  return {
    kind: 'custom',
    key: definition.key,
    visible,
    required: false,
    definition,
  };
}

function jobCollection(
  key: string,
  extra: { descriptionFieldKey?: string; allowOverrides?: boolean } = {},
  visible = true,
): BoardJobFormField {
  return {
    kind: 'collection',
    key,
    visible,
    required: false,
    definition: {
      key,
      label: `${key} label`,
      typeId: `type-${key}`,
      multiple: true,
      required: false,
      ...extra,
    },
  };
}

const salaryBand: CustomFieldDefinition = {
  key: 'band',
  label: 'Band',
  type: 'single_select',
  required: false,
  options: [{ key: 'b3', label: 'Band 3' }],
};
const clearance: CustomFieldDefinition = {
  key: 'clearance',
  label: 'Clearance',
  type: 'boolean',
  required: false,
};
const headcount: CustomFieldDefinition = {
  key: 'headcount',
  label: 'Headcount',
  type: 'number',
  required: false,
};
const aboutTeam: CustomFieldDefinition = {
  key: 'about_team',
  label: 'About the team',
  type: 'rich_text',
  required: false,
};
const dayToDay: CustomFieldDefinition = {
  key: 'day_to_day',
  label: 'Day to day',
  type: 'long_text',
  required: false,
};

describe('scalarSizeClass', () => {
  it.each([
    ['number', 'fact'],
    ['date', 'fact'],
    ['boolean', 'fact'],
    ['short_text', 'fact'],
    ['single_select', 'fact'],
    ['multi_select', 'fact'],
    ['url', 'fact'],
    ['email', 'fact'],
    ['phone', 'fact'],
    ['long_text', 'prose'],
    ['rich_text', 'prose'],
    ['image', 'media'],
    ['image_gallery', 'media'],
    ['file', 'media'],
  ])('places %s as %s', (type, zone) => {
    expect(scalarSizeClass(type)).toBe(zone);
  });

  it('skips a type it does not know', () => {
    expect(scalarSizeClass('hologram')).toBeNull();
  });
});

describe('collectionPresentation', () => {
  const plain = { description: null };
  const described = {
    description: { kind: 'text' as const, text: 'Five more days.' },
  };

  it('is chips when no entry has a description', () => {
    expect(collectionPresentation([plain, plain])).toBe('chips');
  });

  it('is a list when an entry carries a description', () => {
    expect(collectionPresentation([plain, described])).toBe('list');
  });
});

describe('jobDetailFields', () => {
  it('places custom fields by type in the job form order, skipping hidden and empty ones', () => {
    const zones = jobDetailFields(
      {
        customFieldValues: {
          band: 'b3',
          clearance: false,
          headcount: 0,
          about_team: '<p>We ship.</p>',
          day_to_day: 'Line one\nLine two',
        },
        resolvedCollectionFields: [],
      },
      [salaryBand, clearance, headcount, aboutTeam, dayToDay],
      {
        forms: {
          job: [
            jobCustom(headcount),
            jobCustom(dayToDay),
            jobCustom(clearance),
            jobCustom(salaryBand, false),
            jobCustom(aboutTeam),
          ],
        },
      },
      format,
    );

    // `0` and `false` are real values; the hidden band never renders.
    expect(zones.facts.map((fact) => [fact.key, fact.value])).toEqual([
      ['headcount', { kind: 'text', text: '0' }],
      ['clearance', { kind: 'text', text: 'NO' }],
    ]);
    expect(zones.prose.map((field) => [field.key, field.value])).toEqual([
      ['day_to_day', { kind: 'text', text: 'Line one\nLine two' }],
      ['about_team', { kind: 'html', html: '<p>We ship.</p>' }],
    ]);
  });

  it('renders nothing for empty values and unknown select options', () => {
    const zones = jobDetailFields(
      {
        customFieldValues: { band: 'unknown', about_team: '<p> </p>' },
        resolvedCollectionFields: [],
      },
      [salaryBand, aboutTeam, dayToDay],
      { forms: { job: [jobCustom(salaryBand), jobCustom(aboutTeam)] } },
      format,
    );
    expect(zones.facts).toEqual([]);
    expect(zones.prose).toEqual([]);
  });

  it('does not group a year-like number, but groups a large one', () => {
    const founded: CustomFieldDefinition = {
      key: 'founded',
      label: 'Founded',
      type: 'number',
      required: false,
    };
    const zones = jobDetailFields(
      {
        customFieldValues: { founded: 2016, headcount: 12500 },
        resolvedCollectionFields: [],
      },
      [founded, headcount],
      null,
      format,
    );
    expect(zones.facts.map((fact) => fact.value)).toEqual([
      { kind: 'text', text: '2016' },
      { kind: 'text', text: '12,500' },
    ]);
  });

  it('falls back to definition order without a form layout', () => {
    const zones = jobDetailFields(
      {
        customFieldValues: { band: 'b3', headcount: 12 },
        resolvedCollectionFields: [],
      },
      [salaryBand, headcount],
      null,
      format,
    );
    expect(zones.facts.map((fact) => fact.value)).toEqual([
      { kind: 'text', text: 'Band 3' },
      { kind: 'text', text: '12' },
    ]);
  });

  it('lists described collections and chips the rest, whatever other fields entries carry', () => {
    const summary: EntryField = {
      key: 'summary',
      label: 'Summary',
      type: 'rich_text',
    };
    const days: EntryField = { key: 'days', label: 'Days', type: 'number' };
    const category: EntryField = {
      key: 'category',
      label: 'Category',
      type: 'reference',
    };
    const zones = jobDetailFields(
      {
        customFieldValues: {},
        resolvedCollectionFields: [
          {
            key: 'stack',
            label: 'Stack',
            entries: [
              jobEntry({
                id: 'ts',
                title: 'TypeScript',
                fields: [logoField, category],
                values: { logo: media('ts.png') },
                references: {
                  category: [
                    { id: 'lang', name: 'Language', fields: [], values: {} },
                  ],
                },
                logoUrl: 'https://cdn.test/ts.png',
              }),
              jobEntry({ id: 'go', title: 'Go', fields: [logoField] }),
            ],
          },
          {
            key: 'benefits',
            label: 'Benefits',
            entries: [
              jobEntry({
                id: 'leave',
                title: 'Extra leave',
                description: '<p>Paid.</p>',
                fields: [summary, days],
                values: { summary: '<p>Paid.</p>', days: 5 },
              }),
            ],
          },
          { key: 'perks', label: 'Perks', entries: [] },
        ],
      },
      [],
      {
        forms: {
          job: [
            jobCollection('benefits', { descriptionFieldKey: 'summary' }),
            jobCollection('stack', { allowOverrides: true }),
            jobCollection('perks'),
          ],
        },
      },
      format,
    );

    // A reference field and a logo never make an entry a list item.
    const typescript = {
      id: 'ts',
      title: 'TypeScript',
      logoUrl: 'https://cdn.test/ts.png',
      description: null,
    };
    const go = { id: 'go', title: 'Go', logoUrl: null, description: null };
    expect(zones.chipCollections).toEqual([
      {
        key: 'stack',
        label: 'stack label',
        entries: [typescript, go],
        // The single reference groups the expanded view; Go has no category.
        groups: [
          { key: 'category:lang', label: 'Language', entries: [typescript] },
          { key: 'other', label: 'OTHER', entries: [go] },
        ],
      },
    ]);
    // The description renders as HTML because the default description field
    // is rich text; the entry's other fields are not carried.
    expect(zones.listCollections).toEqual([
      {
        key: 'benefits',
        label: 'benefits label',
        entries: [
          {
            id: 'leave',
            title: 'Extra leave',
            logoUrl: null,
            description: { kind: 'html', html: '<p>Paid.</p>' },
          },
        ],
        groups: null,
      },
    ]);
  });

  it('is chips when the definition names a description field but no entry has one', () => {
    const zones = jobDetailFields(
      {
        customFieldValues: {},
        resolvedCollectionFields: [
          {
            key: 'benefits',
            label: 'Benefits',
            entries: [
              jobEntry({
                fields: [
                  { key: 'summary', label: 'Summary', type: 'long_text' },
                ],
              }),
            ],
          },
        ],
      },
      [],
      {
        forms: {
          job: [jobCollection('benefits', { descriptionFieldKey: 'summary' })],
        },
      },
      format,
    );
    expect(zones.listCollections).toEqual([]);
    expect(zones.chipCollections.map((c) => c.key)).toEqual(['benefits']);
  });

  it('lists a collection when a job wrote its own wording for an entry', () => {
    const zones = jobDetailFields(
      {
        customFieldValues: {},
        resolvedCollectionFields: [
          {
            key: 'stack',
            label: 'Stack',
            entries: [
              jobEntry({
                id: 'ts',
                name: 'TypeScript',
                title: 'TypeScript everywhere',
                titleOverride: 'TypeScript everywhere',
                description: 'Front end and back end.',
                descriptionOverride: 'Front end and back end.',
              }),
            ],
          },
        ],
      },
      [],
      { forms: { job: [jobCollection('stack', { allowOverrides: true })] } },
      format,
    );
    expect(zones.chipCollections).toEqual([]);
    expect(zones.listCollections[0]!.entries).toEqual([
      expect.objectContaining({
        title: 'TypeScript everywhere',
        description: { kind: 'text', text: 'Front end and back end.' },
      }),
    ]);
  });

  it('treats a plain-text default description as text', () => {
    const zones = jobDetailFields(
      {
        customFieldValues: {},
        resolvedCollectionFields: [
          {
            key: 'benefits',
            label: 'Benefits',
            entries: [
              jobEntry({
                description: '<b>not html</b>',
                fields: [{ key: 'blurb', label: 'Blurb', type: 'long_text' }],
              }),
            ],
          },
        ],
      },
      [],
      {
        forms: {
          job: [jobCollection('benefits', { descriptionFieldKey: 'blurb' })],
        },
      },
      format,
    );
    expect(zones.listCollections[0]!.entries[0]!.description).toEqual({
      kind: 'text',
      text: '<b>not html</b>',
    });
  });

  it('never renders a collection the layout hides', () => {
    const zones = jobDetailFields(
      {
        customFieldValues: {},
        resolvedCollectionFields: [
          { key: 'stack', label: 'Stack', entries: [jobEntry()] },
        ],
      },
      [],
      { forms: { job: [jobCollection('stack', {}, false)] } },
      format,
    );
    expect(zones.chipCollections).toEqual([]);
    expect(zones.listCollections).toEqual([]);
  });
});

function profileCustom(
  definition: Partial<ProfileCustom> & Pick<ProfileCustom, 'key' | 'type'>,
  visible = true,
): BoardProfileFormField {
  return {
    kind: 'custom',
    key: definition.key,
    visible,
    required: false,
    definition: {
      label: `${definition.key} label`,
      required: false,
      visibility: 'public',
      editableByOwner: true,
      ...definition,
    },
  };
}

function profileCollection(
  key: string,
  extra: Partial<ProfileCollection> = {},
): BoardProfileFormField {
  return {
    kind: 'collection',
    key,
    visible: true,
    required: false,
    definition: {
      key,
      label: `${key} label`,
      typeId: `type-${key}`,
      multiple: true,
      visibility: 'public',
      editableByOwner: true,
      allowOverrides: false,
      ...extra,
    },
  };
}

function selection(
  fieldKey: string,
  overrides: Partial<Selection> = {},
): Selection {
  return {
    fieldKey,
    fieldLabel: `${fieldKey} wire label`,
    recordId: `${fieldKey}-rec`,
    title: 'Entry',
    fields: [],
    attributes: {},
    valueDefinitions: [],
    entryDefinitions: [],
    values: {},
    entries: [],
    ...overrides,
  };
}

describe('companyDetailFields', () => {
  it('places scalar fields by type in the company form order', () => {
    const zones = companyDetailFields(
      {
        customFieldValues: {
          founded: '2019-06-01',
          site: 'javascript:alert(1)',
          press: 'press@acme.test',
          phone: '+61 2 5550 1234',
          story: 'Started in a garage.',
          hidden: 'secret',
        },
        objectReferences: [],
      },
      [
        profileCustom({ key: 'story', type: 'long_text' }),
        profileCustom({ key: 'press', type: 'email' }),
        profileCustom({ key: 'site', type: 'url' }),
        profileCustom({ key: 'phone', type: 'phone' }),
        profileCustom({ key: 'hidden', type: 'short_text' }, false),
        profileCustom({ key: 'founded', type: 'date' }),
      ],
      format,
    );

    expect(zones.prose.map((field) => field.key)).toEqual(['story']);
    expect(zones.facts.map((fact) => fact.key)).toEqual([
      'press',
      'site',
      'phone',
      'founded',
    ]);
    expect(zones.facts[0]!.value).toEqual({
      kind: 'link',
      text: 'press@acme.test',
      href: 'mailto:press@acme.test',
    });
    // A non-http URL is shown as text, never as a link.
    expect(zones.facts[1]!.value).toEqual({
      kind: 'text',
      text: 'javascript:alert(1)',
    });
    expect(zones.facts[2]!.value).toMatchObject({ href: 'tel:+61255501234' });
  });

  it('places galleries in the main column and files in documents', () => {
    const zones = companyDetailFields(
      {
        // Media metadata rides on these values at runtime.
        customFieldValues: JSON.parse(
          JSON.stringify({
            office: [media('a.png'), media('b.png')],
            deck: media('deck.pdf'),
          }),
        ),
        objectReferences: [],
      },
      [
        profileCustom({ key: 'office', type: 'image_gallery' }),
        profileCustom({ key: 'deck', type: 'file' }),
      ],
      format,
    );
    expect(zones.media).toEqual([
      {
        key: 'office',
        label: 'office label',
        layout: 'gallery',
        images: [
          { url: 'https://cdn.test/a.png', alt: 'office label 1/2' },
          { url: 'https://cdn.test/b.png', alt: 'office label 2/2' },
        ],
      },
    ]);
    expect(zones.documents).toEqual([
      {
        key: 'deck',
        label: 'deck label',
        files: [
          expect.objectContaining({
            url: 'https://cdn.test/deck.pdf',
            name: 'deck.pdf',
          }),
        ],
      },
    ]);
  });

  it('lists a described collection and chips one with only badges and details', () => {
    const zones = companyDetailFields(
      {
        customFieldValues: {},
        objectReferences: [
          selection('certs', {
            recordId: 'iso',
            title: 'ISO 27001',
            fields: [
              { key: 'issuer', label: 'Issuer', type: 'short_text' },
              { key: 'website', label: 'Website', type: 'url' },
              { key: 'badge', label: 'Badge', type: 'image' },
            ],
            attributes: {
              issuer: 'BSI',
              website: 'https://bsi.test',
              badge: media('iso.png'),
            },
            valueDefinitions: [
              {
                key: 'since',
                label: 'Since',
                type: 'number',
                required: false,
                visibility: 'public',
                editableByOwner: true,
              },
            ],
            values: { since: 2021 },
          }),
          selection('benefits', {
            recordId: 'leave',
            title: 'Extra leave',
            description: 'Audited yearly.',
          }),
        ],
      },
      [profileCollection('benefits'), profileCollection('certs')],
      format,
    );
    expect(zones.listCollections.map((c) => c.key)).toEqual(['benefits']);
    expect(zones.listCollections[0]!.entries[0]).toEqual({
      id: 'leave',
      title: 'Extra leave',
      logoUrl: null,
      description: { kind: 'text', text: 'Audited yearly.' },
    });
    // The only image field is the badge, so it is the chip's logo.
    expect(zones.chipCollections).toEqual([
      {
        key: 'certs',
        label: 'certs label',
        entries: [
          {
            id: 'iso',
            title: 'ISO 27001',
            logoUrl: 'https://cdn.test/iso.png',
            description: null,
          },
        ],
        groups: null,
      },
    ]);
  });

  it('keeps chips chips however many entries are selected', () => {
    const many = Array.from({ length: 40 }, (_, index) =>
      selection('regions', { recordId: `region-${index}` }),
    );
    const zones = companyDetailFields(
      {
        customFieldValues: {},
        objectReferences: [selection('tech', { recordId: 'ts' }), ...many],
      },
      [profileCollection('tech'), profileCollection('regions')],
      format,
    );
    expect(zones.listCollections).toEqual([]);
    expect(zones.chipCollections.map((c) => [c.key, c.entries.length])).toEqual(
      [
        ['tech', 1],
        ['regions', 40],
      ],
    );
  });

  it('never places a private field or collection', () => {
    const zones = companyDetailFields(
      {
        customFieldValues: { code: 'X-1', size: 12 },
        objectReferences: [
          selection('vendors', { recordId: 'v' }),
          selection('tech', {
            recordId: 'ts',
            valueDefinitions: [
              {
                key: 'spend',
                label: 'Spend',
                type: 'number',
                required: false,
                visibility: 'private',
                editableByOwner: false,
              },
            ],
            values: { spend: 9000 },
          }),
        ],
      },
      [
        profileCustom({
          key: 'code',
          type: 'short_text',
          visibility: 'private',
        }),
        profileCustom({ key: 'size', type: 'number' }),
        profileCollection('vendors', { visibility: 'private' }),
        profileCollection('tech'),
      ],
      format,
    );
    expect(zones.facts.map((fact) => fact.key)).toEqual(['size']);
    expect(zones.listCollections).toEqual([]);
    expect(zones.chipCollections.map((c) => c.key)).toEqual(['tech']);
  });

  it('without a layout keeps collections in API order and skips unlabelled scalars', () => {
    const zones = companyDetailFields(
      {
        customFieldValues: { tier: 'gold' },
        objectReferences: [
          selection('tech', { recordId: 'a' }),
          selection('awards', { recordId: 'b' }),
          selection('tech', { recordId: 'c' }),
        ],
      },
      null,
      format,
    );
    expect(zones.facts).toEqual([]);
    expect(
      zones.chipCollections.map((c) => [
        c.key,
        c.label,
        c.entries.map((e) => e.id),
      ]),
    ).toEqual([
      ['tech', 'tech wire label', ['a', 'c']],
      ['awards', 'awards wire label', ['b']],
    ]);
  });
});

describe('collection groups', () => {
  const kind: EntryField = {
    key: 'kind',
    label: 'Kind',
    type: 'single_select',
    options: [
      { key: 'health', label: 'Health' },
      { key: 'time_off', label: 'Time off' },
      { key: 'money', label: 'Money' },
    ],
  };

  function groupIds(
    groups: { label: string; entries: { id: string }[] }[] | null,
  ) {
    return groups?.map((group) => [
      group.label,
      group.entries.map((entry) => entry.id),
    ]);
  }

  it('groups by a single select in option order, uncategorised entries last', () => {
    const benefit = (recordId: string, value?: string) =>
      selection('benefits', {
        recordId,
        title: recordId,
        fields: [kind],
        attributes: value === undefined ? {} : { kind: value },
      });
    const zones = companyDetailFields(
      {
        customFieldValues: {},
        objectReferences: [
          benefit('leave', 'time_off'),
          benefit('dental', 'health'),
          benefit('bonus', 'retired_option'),
          benefit('gym'),
          benefit('cover', 'health'),
        ],
      },
      [profileCollection('benefits')],
      format,
    );
    // The flat order is untouched; Money has no entries, so no subheading.
    expect(zones.chipCollections[0]!.entries.map((e) => e.id)).toEqual([
      'leave',
      'dental',
      'bonus',
      'gym',
      'cover',
    ]);
    expect(groupIds(zones.chipCollections[0]!.groups)).toEqual([
      ['Health', ['dental', 'cover']],
      ['Time off', ['leave']],
      ['OTHER', ['bonus', 'gym']],
    ]);
  });

  it('groups by a single reference in order of first appearance', () => {
    const category: EntryField = {
      key: 'category',
      label: 'Category',
      type: 'reference',
    };
    const tool = (id: string, ref: { id: string; name: string }) =>
      jobEntry({
        id,
        title: id,
        fields: [category],
        references: { category: [{ ...ref, fields: [], values: {} }] },
      });
    const backend = { id: 'be', name: 'Backend' };
    const frontend = { id: 'fe', name: 'Frontend' };
    const zones = jobDetailFields(
      {
        customFieldValues: {},
        resolvedCollectionFields: [
          {
            key: 'stack',
            label: 'Stack',
            entries: [
              tool('go', backend),
              tool('react', frontend),
              tool('postgres', backend),
            ],
          },
        ],
      },
      [],
      { forms: { job: [jobCollection('stack')] } },
      format,
    );
    expect(groupIds(zones.chipCollections[0]!.groups)).toEqual([
      ['Backend', ['go', 'postgres']],
      ['Frontend', ['react']],
    ]);
  });

  it('skips a reference an entry uses more than once and takes the next categorising field', () => {
    const tags: EntryField = { key: 'tags', label: 'Tags', type: 'reference' };
    const row = (id: string) => ({ id, name: id, fields: [], values: {} });
    const zones = jobDetailFields(
      {
        customFieldValues: {},
        resolvedCollectionFields: [
          {
            key: 'perks',
            label: 'Perks',
            entries: [
              jobEntry({
                id: 'a',
                fields: [tags, kind],
                values: { kind: 'money' },
                references: { tags: [row('x'), row('y')] },
              }),
              jobEntry({
                id: 'b',
                fields: [tags, kind],
                values: { kind: 'health' },
                references: { tags: [row('x')] },
              }),
            ],
          },
        ],
      },
      [],
      { forms: { job: [jobCollection('perks')] } },
      format,
    );
    expect(groupIds(zones.chipCollections[0]!.groups)).toEqual([
      ['Health', ['b']],
      ['Money', ['a']],
    ]);
  });

  it('has no groups without a single-valued categorising field that entries fill', () => {
    const zones = companyDetailFields(
      {
        customFieldValues: {},
        objectReferences: [
          selection('tools', {
            recordId: 'a',
            fields: [
              { key: 'notes', label: 'Notes', type: 'short_text' },
              {
                key: 'areas',
                label: 'Areas',
                type: 'multi_select',
                options: [{ key: 'x', label: 'X' }],
              },
              kind,
            ],
            attributes: { notes: 'Fast', areas: ['x'] },
          }),
        ],
      },
      [profileCollection('tools')],
      format,
    );
    expect(zones.chipCollections[0]!.groups).toBeNull();
  });
});
