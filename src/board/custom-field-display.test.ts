import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import {
  profileLayoutFields,
  resolveFieldDisplay,
  resolveProfileFieldDisplay,
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
    // The extension is a `tel:` parameter, not more digits of the number.
    [
      'phone with an extension',
      field('p', 'phone'),
      '+1 555 123 4567 ext 89',
      {
        kind: 'link',
        href: 'tel:+15551234567;ext=89',
        text: '+1 555 123 4567 ext 89',
        external: false,
      },
    ],
    // A bracketed trunk 0 after the country code is not dialled.
    [
      'phone with a bracketed trunk 0',
      field('p', 'phone'),
      '+44 (0)20 7946 0958',
      {
        kind: 'link',
        href: 'tel:+442079460958',
        text: '+44 (0)20 7946 0958',
        external: false,
      },
    ],
  ])('formats %s', (_name, source, value, expected) => {
    expect(one(source, value)).toEqual(expected);
  });

  it('formats a date for the locale rather than showing the stored string', () => {
    const value = one(field('d', 'date'), '2026-12-01');
    expect(value).toMatchObject({ kind: 'text', multiline: false });
    expect(value).not.toMatchObject({ text: '2026-12-01' });
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
    const entries = resolveProfileFieldDisplay(
      [
        { kind: 'collection', key: 'assoc', label: 'Associations' },
        field('empty', 'short_text'),
        field('n', 'number'),
        { kind: 'collection', key: 'none', label: 'None' },
      ],
      {
        customFieldValues: { n: 3 },
        objectReferences: [
          { fieldKey: 'assoc', recordId: 'r2', title: 'HIA' },
          {
            fieldKey: 'assoc',
            recordId: 'r1',
            title: 'MBQ',
            logoUrl: 'https://l.example/m.png',
          },
        ],
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
      required: false,
      visibility: 'public' as const,
      editableByOwner: true,
    };
    const collection = {
      key: 'assoc',
      label: 'Associations',
      typeId: 'type_1',
      multiple: true,
      visibility: 'public' as const,
      editableByOwner: true,
      allowOverrides: false,
    };
    expect(
      profileLayoutFields([
        {
          kind: 'builtin',
          key: 'bio',
          visible: true,
          required: false,
          locked: false,
          lockReason: null,
        },
        {
          kind: 'collection',
          key: 'assoc',
          visible: true,
          required: false,
          definition: collection,
        },
        {
          kind: 'custom',
          key: 'hidden',
          visible: false,
          required: false,
          definition: { ...definition, key: 'hidden' },
        },
        {
          kind: 'custom',
          key: 'licence',
          visible: true,
          required: false,
          definition,
        },
      ]),
    ).toEqual([
      { kind: 'collection', key: 'assoc', label: 'Associations' },
      { kind: 'custom', definition },
    ]);
    expect(profileLayoutFields(null)).toEqual([]);
  });
});
