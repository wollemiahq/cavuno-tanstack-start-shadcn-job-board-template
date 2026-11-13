/**
 * Custom and collection field DISPLAY — the view-model seam every public
 * page uses to show the operator's own fields: the talent profile, company
 * page and job page, and their directory and search detail panes.
 *
 * `resolveFieldDisplay` walks the fields in the operator's form order and
 * turns each stored value into one plain, fully-resolved entry, formatted
 * for its type: text, formatted text, chips, a link, images, files or
 * collection entries. A field with no value yields no entry, so a page
 * never shows an empty label. Only what the read returned is shown: the API
 * already omits private fields, and redacted previews carry no values.
 *
 * The SDK's `resolveCustomFieldDisplay` reports URLs, emails, phones, dates
 * and selects all as `kind: 'text'`, and passes a file field's stored id
 * through as text, so this resolves from the definition's `type` instead.
 */
import { formatDate } from '@cavuno/board/format';

import {
  customFieldLabel,
  customFieldOptionLabel,
} from '@/board/custom-field-labels';
import type { ProfileCustomDefinition } from '@/board/form-layout';
import { m } from '@/paraglide/messages';
import type { BoardProfileFormField } from '@cavuno/board';

/**
 * The field types an operator can add. Profile fields have every type; job
 * fields a subset of them.
 */
export type CustomFieldDisplayType = ProfileCustomDefinition['type'];

/** One field to show, in order: a custom field or a collection field. */
export type DisplayFieldSource =
  | {
      kind: 'custom';
      definition: {
        key: string;
        label: string;
        type: CustomFieldDisplayType;
        options?: ReadonlyArray<{ key: string; label: string }>;
      };
    }
  | { kind: 'collection'; key: string; label: string };

/** One saved file of an image gallery or file field. */
export interface DisplayFieldMedia {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  url: string;
}

/** One selected entry of a collection field. */
export interface DisplayCollectionEntry {
  id: string;
  title: string;
  logoUrl?: string | null;
}

/** One stored answer, as `customFieldValues` carries it. */
export type DisplayFieldValue = string | number | boolean | string[];

/** A record's stored answers, as the public reads return them. */
export interface DisplayFieldRecord {
  values: Readonly<Record<string, DisplayFieldValue>>;
  media?: Readonly<Record<string, readonly DisplayFieldMedia[]>>;
  /** Selected collection entries, by collection field key. */
  collections?: ReadonlyMap<string, readonly DisplayCollectionEntry[]>;
}

/** One gallery image, ready to render. */
export interface FieldDisplayImage {
  id: string;
  url: string;
  name: string;
}

export type FieldDisplayValue =
  /** Plain text; `multiline` keeps the line breaks of a long text answer. */
  | { kind: 'text'; text: string; multiline: boolean }
  /** API-sanitized rich-text HTML. Render it as-is, never interpolate. */
  | { kind: 'html'; html: string }
  | { kind: 'chips'; items: string[] }
  | { kind: 'link'; href: string; text: string; external: boolean }
  | { kind: 'images'; images: FieldDisplayImage[] }
  | {
      kind: 'files';
      files: { id: string; url: string; name: string; sizeLabel: string }[];
    }
  | {
      kind: 'collection';
      entries: { id: string; title: string; logoUrl: string | null }[];
    };

export interface FieldDisplayEntry {
  /** Stable React key: `custom:{key}` or `collection:{key}`. */
  id: string;
  label: string;
  type: CustomFieldDisplayType | 'collection';
  value: FieldDisplayValue;
}

/**
 * The stored answer as text or as a number. `customFieldValues` is a typed
 * union, and the definition's type says which member a field stores; these
 * pick that member, so a value of another shape shows nothing.
 */
function textOf(value: DisplayFieldValue | undefined): string | null {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- selects the string member of the API's typed value union
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function numberOf(value: DisplayFieldValue | undefined): number | null {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- selects the number member of the API's typed value union
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** `https://` in front of a bare domain, and nothing that is not http(s). */
function webHref(value: string): string | null {
  const trimmed = value.trim();
  const href = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/**
 * A `tel:` link for a phone answer. The API accepts an extension after the
 * number (`ext 89`, `x89`, `#89`); it becomes the RFC 3966 `;ext=` parameter
 * rather than extra digits of the number.
 */
function telHref(value: string): string {
  const match = /^(.*?)\s*(?:ext\.?|x|#)\s*(\d+)$/i.exec(value.trim());
  // "+44 (0)20 …": the bracketed trunk 0 is not dialled after a country code.
  const number = (match ? match[1]! : value)
    .replace(/\(0\)/g, '')
    .replace(/[^\d+]/g, '');
  return match ? `tel:${number};ext=${match[2]}` : `tel:${number}`;
}

/** A file size in the board locale's short units, such as "402 kB". */
export function sizeLabel(bytes: number, locale: string): string {
  const [value, unit] =
    bytes < 1024
      ? [bytes, 'byte']
      : bytes < 1024 * 1024
        ? [bytes / 1024, 'kilobyte']
        : [bytes / (1024 * 1024), 'megabyte'];
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits: unit === 'megabyte' ? 1 : 0,
    }).format(value);
  } catch {
    return `${Math.round(value)} ${unit}`;
  }
}

function customValue(
  definition: Extract<DisplayFieldSource, { kind: 'custom' }>['definition'],
  record: DisplayFieldRecord,
  locale: string,
): FieldDisplayValue | null {
  const raw = record.values[definition.key];
  const text = textOf(raw);
  const optionLabel = (key: string) => {
    const option = definition.options?.find((o) => o.key === key);
    return option
      ? customFieldOptionLabel(definition.key, option, locale)
      : null;
  };

  switch (definition.type) {
    case 'boolean':
      return raw === true || raw === false
        ? {
            kind: 'text',
            text: raw
              ? m.jobDetail_customFieldYesLabel()
              : m.jobDetail_customFieldNoLabel(),
            multiline: false,
          }
        : null;
    case 'number': {
      const number = numberOf(raw);
      if (number === null) return null;
      let formatted: string;
      try {
        formatted = new Intl.NumberFormat(locale).format(number);
      } catch {
        formatted = String(number);
      }
      return { kind: 'text', text: formatted, multiline: false };
    }
    case 'single_select': {
      const label = text === null ? null : optionLabel(text);
      return label ? { kind: 'chips', items: [label] } : null;
    }
    case 'multi_select': {
      // In option order, the order the operator set the choices in.
      const chosen = new Set(Array.isArray(raw) ? raw : []);
      const items = (definition.options ?? [])
        .filter((option) => chosen.has(option.key))
        .map((option) =>
          customFieldOptionLabel(definition.key, option, locale),
        );
      return items.length > 0 ? { kind: 'chips', items } : null;
    }
    case 'date': {
      if (text === null) return null;
      return {
        kind: 'text',
        text: formatDate(locale, text) ?? text,
        multiline: false,
      };
    }
    case 'url': {
      if (text === null) return null;
      const href = webHref(text);
      const label = text
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/\/$/, '');
      return href
        ? { kind: 'link', href, text: label, external: true }
        : { kind: 'text', text, multiline: false };
    }
    case 'email':
      return text !== null
        ? {
            kind: 'link',
            href: `mailto:${text.trim()}`,
            text: text.trim(),
            external: false,
          }
        : null;
    case 'phone':
      return text !== null
        ? {
            kind: 'link',
            href: telHref(text),
            text: text.trim(),
            external: false,
          }
        : null;
    case 'rich_text':
      return text !== null ? { kind: 'html', html: text } : null;
    case 'image_gallery': {
      const images = (record.media?.[definition.key] ?? []).map((file) => ({
        id: file.id,
        url: file.url,
        name: file.name,
      }));
      return images.length > 0 ? { kind: 'images', images } : null;
    }
    case 'file': {
      const files = (record.media?.[definition.key] ?? []).map((file) => ({
        id: file.id,
        url: file.url,
        name: file.name,
        sizeLabel: sizeLabel(file.sizeBytes, locale),
      }));
      return files.length > 0 ? { kind: 'files', files } : null;
    }
    case 'short_text':
    case 'long_text':
      return text !== null
        ? {
            kind: 'text',
            text: text,
            multiline: definition.type === 'long_text',
          }
        : null;
    default:
      // A type the API adds before the starter learns to draw it.
      return null;
  }
}

/** The fields that have an answer, in order, each formatted for its type. */
export function resolveFieldDisplay(
  fields: readonly DisplayFieldSource[],
  record: DisplayFieldRecord,
  locale: string,
): FieldDisplayEntry[] {
  const entries: FieldDisplayEntry[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    const key = field.kind === 'custom' ? field.definition.key : field.key;
    const id = `${field.kind}:${key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    if (field.kind === 'collection') {
      const selected = record.collections?.get(field.key) ?? [];
      if (selected.length === 0) continue;
      entries.push({
        id,
        label: field.label,
        type: 'collection',
        value: {
          kind: 'collection',
          entries: selected.map((entry) => ({
            id: entry.id,
            title: entry.title,
            logoUrl: entry.logoUrl ?? null,
          })),
        },
      });
      continue;
    }
    const value = customValue(field.definition, record, locale);
    if (!value) continue;
    entries.push({
      id,
      label: customFieldLabel(field.definition, locale),
      type: field.definition.type,
      value,
    });
  }
  return entries;
}

/**
 * The custom and collection fields of a company or talent form layout, in
 * order. Built-ins and hidden entries are left out: on a profile, a field
 * the operator hides from the form is hidden from the page too. `null` (an
 * API that predates `forms`) yields no fields: without the layout there are
 * no definitions to format the values with.
 */
export function profileLayoutFields(
  layout: readonly BoardProfileFormField[] | null | undefined,
): DisplayFieldSource[] {
  if (!Array.isArray(layout)) return [];
  return layout.flatMap((field): DisplayFieldSource[] => {
    if (!field.visible) return [];
    if (field.kind === 'custom') {
      return [{ kind: 'custom', definition: field.definition }];
    }
    if (field.kind === 'collection') {
      return [
        { kind: 'collection', key: field.key, label: field.definition.label },
      ];
    }
    return [];
  });
}

/** A company or talent public read's custom and collection answers. */
export interface ProfileFieldAnswers {
  customFieldValues?: Readonly<Record<string, DisplayFieldValue>>;
  customFieldMedia?: Readonly<Record<string, readonly DisplayFieldMedia[]>>;
  objectReferences?: ReadonlyArray<{
    fieldKey: string;
    recordId: string;
    title: string;
    logoUrl?: string;
  }>;
}

/** A company or talent read's answered fields, in the layout's order. */
export function resolveProfileFieldDisplay(
  layout: readonly DisplayFieldSource[],
  profile: ProfileFieldAnswers,
  locale: string,
): FieldDisplayEntry[] {
  const collections = new Map<string, DisplayCollectionEntry[]>();
  for (const reference of profile.objectReferences ?? []) {
    const list = collections.get(reference.fieldKey) ?? [];
    list.push({
      id: reference.recordId,
      title: reference.title,
      logoUrl: reference.logoUrl ?? null,
    });
    collections.set(reference.fieldKey, list);
  }
  return resolveFieldDisplay(
    layout,
    {
      values: profile.customFieldValues ?? {},
      media: profile.customFieldMedia ?? {},
      collections,
    },
    locale,
  );
}
