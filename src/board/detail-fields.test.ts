import { describe, expect, it } from 'vitest';

import {
  collectionSizeClass,
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

describe('collectionSizeClass', () => {
  const base = { fields: [logoField], logoFieldKeys: new Set(['logo']) };

  it('is compact when entries carry only a title and a logo', () => {
    expect(collectionSizeClass(base)).toBe('compact');
  });

  it('is rich with a default description field', () => {
    expect(
      collectionSizeClass({ ...base, descriptionFieldKey: 'summary' }),
    ).toBe('rich');
  });

  it('is rich when records may write their own wording', () => {
    expect(collectionSizeClass({ ...base, allowOverrides: true })).toBe('rich');
  });

  it('is rich with another public field', () => {
    expect(
      collectionSizeClass({
        ...base,
        fields: [logoField, { key: 'days', label: 'Days', type: 'number' }],
      }),
    ).toBe('rich');
  });

  it('is rich with per-record details', () => {
    expect(collectionSizeClass({ ...base, hasSelectionDetails: true })).toBe(
      'rich',
    );
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

  it('splits collections into compact chips and rich cards by their definition', () => {
    const summary: EntryField = {
      key: 'summary',
      label: 'Summary',
      type: 'rich_text',
    };
    const days: EntryField = { key: 'days', label: 'Days', type: 'number' };
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
                fields: [logoField],
                values: { logo: media('ts.png') },
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
            jobCollection('stack'),
            jobCollection('perks'),
          ],
        },
      },
      format,
    );

    expect(zones.compactCollections).toEqual([
      {
        key: 'stack',
        label: 'stack label',
        entries: [
          expect.objectContaining({
            id: 'ts',
            title: 'TypeScript',
            logoUrl: 'https://cdn.test/ts.png',
            details: [],
          }),
          expect.objectContaining({ id: 'go', title: 'Go', logoUrl: null }),
        ],
      },
    ]);
    expect(zones.richCollections).toHaveLength(1);
    const [leave] = zones.richCollections[0]!.entries;
    // The description field renders as the description (HTML, because the
    // default description field is rich text), not again as a detail.
    expect(leave).toMatchObject({
      title: 'Extra leave',
      description: { kind: 'html', html: '<p>Paid.</p>' },
      details: [
        { key: 'days', label: 'Days', value: { kind: 'text', text: '5' } },
      ],
    });
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
    expect(zones.richCollections[0]!.entries[0]!.description).toEqual({
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
    expect(zones.compactCollections).toEqual([]);
    expect(zones.richCollections).toEqual([]);
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

  it('makes a collection with per-selection details rich and a bare one compact', () => {
    const zones = companyDetailFields(
      {
        customFieldValues: {},
        objectReferences: [
          selection('tech', { recordId: 'ts', title: 'TypeScript' }),
          selection('certs', {
            recordId: 'iso',
            title: 'ISO 27001',
            description: 'Audited yearly.',
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
        ],
      },
      [profileCollection('certs'), profileCollection('tech')],
      format,
    );
    expect(zones.compactCollections.map((c) => c.key)).toEqual(['tech']);
    expect(zones.richCollections.map((c) => c.key)).toEqual(['certs']);
    expect(zones.richCollections[0]!.entries[0]).toMatchObject({
      title: 'ISO 27001',
      description: { kind: 'text', text: 'Audited yearly.' },
      details: [{ key: 'since', label: 'Since' }],
    });
  });

  it('keeps a compact collection compact however many entries are selected', () => {
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
    expect(zones.richCollections).toEqual([]);
    expect(
      zones.compactCollections.map((c) => [c.key, c.entries.length]),
    ).toEqual([
      ['tech', 1],
      ['regions', 40],
    ]);
  });

  it('never places a private field, collection or selection detail', () => {
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
    // Only public definitions decide the size class: a private per-selection
    // detail neither shows nor turns chips into cards.
    expect(zones.richCollections).toEqual([]);
    expect(zones.compactCollections.map((c) => c.key)).toEqual(['tech']);
    expect(zones.compactCollections[0]!.entries[0]!.details).toEqual([]);
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
      zones.compactCollections.map((c) => [
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
