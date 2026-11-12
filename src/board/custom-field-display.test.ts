import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import {
  groupCompanyFields,
  groupTalentProfileFields,
  profileCollections,
  profileLayoutFields,
  resolveFieldDisplay,
  type CustomFieldDisplayType,
  type DisplayFieldSource,
  type DisplayFieldValue,
} from './custom-field-display';

const field = (
  key: string,
  type: CustomFieldDisplayType,
  options?: { key: string; label: string }[],
): DisplayFieldSource => ({
  kind: 'custom',
  definition: { key, label: `Label ${key}`, type, options },
});

const media = (id: string, sizeBytes = 2048) => ({
  id,
  name: `${id}.jpg`,
  contentType: 'image/jpeg',
  sizeBytes,
  url: `https://files.example/${id}`,
});

const one = (
  source: DisplayFieldSource,
  value: DisplayFieldValue,
  extra = {},
) =>
  resolveFieldDisplay(
    [source],
    {
      values: {
        [source.kind === 'custom' ? source.definition.key : source.key]: value,
      },
      ...extra,
    },
    'en',
  )[0]?.value ?? null;

describe('resolveFieldDisplay', () => {
  const tiers = [
    { key: 'gold', label: 'Gold' },
    { key: 'silver', label: 'Silver' },
    { key: 'bronze', label: 'Bronze' },
  ];

  it.each([
    // `false` and `0` are answers, not empty values.
    [
      'boolean false',
      field('b', 'boolean'),
      false,
      {
        kind: 'text',
        text: m.jobDetail_customFieldNoLabel(),
        multiline: false,
      },
    ],
    [
      'boolean true',
      field('b', 'boolean'),
      true,
      {
        kind: 'text',
        text: m.jobDetail_customFieldYesLabel(),
        multiline: false,
      },
    ],
    [
      'number zero',
      field('n', 'number'),
      0,
      { kind: 'text', text: '0', multiline: false },
    ],
    [
      'number with grouping',
      field('n', 'number'),
      12500,
      { kind: 'text', text: '12,500', multiline: false },
    ],
    [
      'short text',
      field('s', 'short_text'),
      'QBCC 1284773',
      { kind: 'text', text: 'QBCC 1284773', multiline: false },
    ],
    [
      'long text keeps line breaks',
      field('l', 'long_text'),
      'Ute\nTrailer',
      { kind: 'text', text: 'Ute\nTrailer', multiline: true },
    ],
    [
      'rich text stays HTML',
      field('r', 'rich_text'),
      '<p>Hi <strong>there</strong></p>',
      { kind: 'html', html: '<p>Hi <strong>there</strong></p>' },
    ],
    // The label, never the stored key.
    [
      'single select',
      field('t', 'single_select', tiers),
      'silver',
      { kind: 'chips', items: ['Silver'] },
    ],
    // Option order, whatever order the keys were stored in.
    [
      'multi select',
      field('t', 'multi_select', tiers),
      ['bronze', 'gold'],
      { kind: 'chips', items: ['Gold', 'Bronze'] },
    ],
    [
      'date',
      field('d', 'date'),
      '2026-12-01',
      { kind: 'text', text: 'Dec 1, 2026', multiline: false },
    ],
    [
      'bare domain URL',
      field('u', 'url'),
      'okafor.example/work/',
      {
        kind: 'link',
        href: 'https://okafor.example/work/',
        text: 'okafor.example/work',
        external: true,
      },
    ],
    // A script URL never becomes a link.
    [
      'script URL',
      field('u', 'url'),
      'javascript:alert(1)',
      { kind: 'text', text: 'javascript:alert(1)', multiline: false },
    ],
    [
      'email',
      field('e', 'email'),
      ' maya@example.com ',
      {
        kind: 'link',
        href: 'mailto:maya@example.com',
        text: 'maya@example.com',
        external: false,
      },
    ],
    [
      'phone',
      field('p', 'phone'),
      '+61 412 555 018',
      {
        kind: 'link',
        href: 'tel:+61412555018',
        text: '+61 412 555 018',
        external: false,
      },
    ],
  ])('formats %s', (_name, source, value, expected) => {
    expect(one(source, value)).toEqual(expected);
  });

  it.each([
    ['blank text', field('s', 'short_text'), '   '],
    ['empty multi select', field('t', 'multi_select', tiers), []],
    [
      'an option that no longer exists',
      field('t', 'single_select', tiers),
      'platinum',
    ],
    ['a gallery with no saved files', field('g', 'image_gallery'), ['file_1']],
    ['a number stored as text', field('n', 'number'), '7'],
  ])('shows nothing for %s', (_name, source, value) => {
    expect(one(source, value)).toBeNull();
  });

  it('shows gallery images and files from the media map, in stored order', () => {
    expect(
      one(field('g', 'image_gallery'), ['b', 'a'], {
        media: { g: [media('b'), media('a')] },
      }),
    ).toEqual({
      kind: 'images',
      images: [
        { id: 'b', url: 'https://files.example/b', name: 'b.jpg' },
        { id: 'a', url: 'https://files.example/a', name: 'a.jpg' },
      ],
    });
    expect(
      one(field('f', 'file'), 'cert', {
        media: { f: [media('cert', 1.5 * 1024 * 1024)] },
      }),
    ).toEqual({
      kind: 'files',
      files: [
        {
          id: 'cert',
          url: 'https://files.example/cert',
          name: 'cert.jpg',
          sizeLabel: '1.5 MB',
        },
      ],
    });
  });

  it('keeps the given order and drops unanswered fields and collections', () => {
    const entries = resolveFieldDisplay(
      [
        { kind: 'collection', key: 'assoc', label: 'Associations' },
        field('empty', 'short_text'),
        field('n', 'number'),
        { kind: 'collection', key: 'none', label: 'None' },
      ],
      {
        values: { n: 3 },
        collections: profileCollections([
          { fieldKey: 'assoc', recordId: 'r2', title: 'HIA' },
          {
            fieldKey: 'assoc',
            recordId: 'r1',
            title: 'MBQ',
            logoUrl: 'https://l.example/m.png',
          },
        ]),
      },
      'en',
    );
    expect(entries.map((entry) => entry.id)).toEqual([
      'collection:assoc',
      'custom:n',
    ]);
    expect(entries[0]?.value).toEqual({
      kind: 'collection',
      entries: [
        { id: 'r2', title: 'HIA', logoUrl: null },
        { id: 'r1', title: 'MBQ', logoUrl: 'https://l.example/m.png' },
      ],
    });
  });
});

describe('profileLayoutFields', () => {
  it('keeps visible custom and collection entries in layout order and skips built-ins', () => {
    const definition = {
      key: 'licence',
      label: 'Licence',
      type: 'short_text' as const,
    };
    expect(
      profileLayoutFields([
        { kind: 'builtin', key: 'bio', visible: true },
        {
          kind: 'collection',
          key: 'assoc',
          visible: true,
          definition: { key: 'assoc', label: 'Associations' },
        },
        {
          kind: 'custom',
          key: 'hidden',
          visible: false,
          definition: { ...definition, key: 'hidden' },
        },
        { kind: 'custom', key: 'licence', visible: true, definition },
      ]),
    ).toEqual([
      { kind: 'collection', key: 'assoc', label: 'Associations' },
      { kind: 'custom', definition },
    ]);
    expect(profileLayoutFields(null)).toEqual([]);
  });
});

describe('field placement', () => {
  const entries = resolveFieldDisplay(
    [
      field('years', 'number'),
      field('site', 'url'),
      field('cert', 'file'),
      field('about', 'rich_text'),
      field('work', 'image_gallery'),
      field('mail', 'email'),
    ],
    {
      values: {
        years: 12,
        site: 'a.example',
        about: '<p>x</p>',
        mail: 'a@b.example',
      },
      media: { cert: [media('c')], work: [media('w')] },
    },
    'en',
  );
  const ids = (list: { id: string }[]) => list.map((entry) => entry.id);

  it('places talent fields by type, galleries before files, each group in form order', () => {
    const groups = groupTalentProfileFields(entries);
    expect(ids(groups.contact)).toEqual(['custom:site', 'custom:mail']);
    expect(ids(groups.about)).toEqual(['custom:about']);
    expect(ids(groups.featured)).toEqual(['custom:work', 'custom:cert']);
    expect(ids(groups.details)).toEqual(['custom:years']);
  });

  it('puts company rich text and galleries in the main column', () => {
    const groups = groupCompanyFields(entries);
    expect(ids(groups.main)).toEqual(['custom:about', 'custom:work']);
    expect(ids(groups.facts)).toEqual([
      'custom:years',
      'custom:site',
      'custom:cert',
      'custom:mail',
    ]);
  });
});
