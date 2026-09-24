/**
 * Detail-page placement for operator-defined data: custom fields and
 * collection selections on the public job and company pages.
 *
 * A collection can hold anything, so placement never depends on how long a
 * value happens to be. Each field gets a SIZE CLASS from its definition type
 * (the same for every record), and the size class picks the zone:
 *
 *   - fact    number, date, boolean, short text, selects, url/email/phone
 *             → the page's facts list
 *   - prose   long and rich text → its own main-column section
 *   - media   image and gallery → main column; file → the rail's documents
 *   - compact a collection whose entries carry only a title and optionally a
 *             logo → chips, in the main column on both pages whatever the
 *             number of selections
 *   - rich    a collection whose entries can carry a description, other
 *             public fields, or per-record details → a card grid
 *
 * Within a zone, fields follow the operator's form layout (`forms.job` /
 * `forms.company`); entries the layout hides never render. Without a layout
 * (an API that predates it) jobs fall back to definition order and companies
 * to the order the API returns selections. Empty values produce nothing, so
 * no page draws an empty heading.
 *
 * Everything here is resolved to plain strings for the presentational
 * components in `src/components/board/detail-fields.tsx`. The only HTML that
 * survives is what the API documents as sanitised: rich text values and a
 * collection description whose default field is rich text.
 */
import { formatDate } from '@cavuno/board/format';

import { searchString } from '../lib/pagination';

import type {
  BoardJobFormField,
  BoardProfileFormField,
  CustomFieldDefinition,
  JobCollectionFieldDefinition,
  PublicCompanyDetail,
  PublicJob,
} from '@cavuno/board';

// ── View model ───────────────────────────────────────────────────────────

export interface DetailImage {
  url: string;
  alt: string;
}

export interface DetailFile {
  url: string;
  name: string;
  /** Localized size ("1.2 MB"), or `null` when the API sent none. */
  sizeLabel: string | null;
}

/** One resolved value, ready to render. */
export type DetailValue =
  /** Plain text; line breaks are meaningful (long text). */
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string }
  /** Sanitised HTML from the API (rich text only). */
  | { kind: 'html'; html: string }
  | { kind: 'images'; images: DetailImage[] }
  | { kind: 'files'; files: DetailFile[] };

/** A labelled value: a fact row, a prose section, a card detail. */
export interface DetailField {
  key: string;
  label: string;
  value: DetailValue;
}

export interface DetailMedia {
  key: string;
  label: string;
  /** One image renders as a figure, a gallery as a thumbnail grid. */
  layout: 'figure' | 'gallery';
  images: DetailImage[];
}

export interface DetailDocuments {
  key: string;
  label: string;
  files: DetailFile[];
}

export interface DetailCollectionEntry {
  id: string;
  title: string;
  logoUrl: string | null;
  /** Rich collections only; `null` when the entry has none. */
  description: Extract<DetailValue, { kind: 'text' | 'html' }> | null;
  /** The entry's other public fields and per-record details. */
  details: DetailField[];
  /** Repeatable per-record rows (company selections only). */
  rows: DetailField[][];
}

export interface DetailCollection {
  key: string;
  label: string;
  entries: DetailCollectionEntry[];
}

export interface DetailFieldZones {
  facts: DetailField[];
  prose: DetailField[];
  media: DetailMedia[];
  documents: DetailDocuments[];
  compactCollections: DetailCollection[];
  richCollections: DetailCollection[];
}

export const EMPTY_DETAIL_FIELDS: DetailFieldZones = {
  facts: [],
  prose: [],
  media: [],
  documents: [],
  compactCollections: [],
  richCollections: [],
};

/** Whether any zone has something to render. */
export function hasDetailFields(zones: DetailFieldZones): boolean {
  return Object.values(zones).some((zone) => zone.length > 0);
}

// ── Formatting inputs ────────────────────────────────────────────────────

/** Copy and locale the resolver needs; the caller owns the message catalog. */
export interface DetailFieldFormat {
  locale: string;
  yesLabel: string;
  noLabel: string;
  galleryImageAlt: (label: string, index: number, count: number) => string;
  /** Localized label for a field; defaults to the definition's label. */
  fieldLabel?: (field: { key: string; label: string }) => string;
  /** Localized label for a select option; defaults to the option's label. */
  optionLabel?: (
    fieldKey: string,
    option: { key: string; label: string },
  ) => string;
}

/** The part of a field definition that decides how a value renders. */
export interface FieldDisplayDefinition {
  key: string;
  label: string;
  type: string;
  options?: ReadonlyArray<{ key: string; label: string }>;
}

// ── Size classes ─────────────────────────────────────────────────────────

export type ScalarSizeClass = 'fact' | 'prose' | 'media';

/**
 * The size class of a scalar field type, or `null` for a type this starter
 * does not know yet (the API may add types before the starter can draw
 * them; those are skipped rather than guessed at).
 */
export function scalarSizeClass(type: string): ScalarSizeClass | null {
  switch (type) {
    case 'number':
    case 'date':
    case 'boolean':
    case 'short_text':
    case 'single_select':
    case 'multi_select':
    case 'url':
    case 'email':
    case 'phone':
      return 'fact';
    case 'long_text':
    case 'rich_text':
      return 'prose';
    case 'image':
    case 'image_gallery':
    case 'file':
      return 'media';
    default:
      return null;
  }
}

/** What a collection definition and its entries' field schema say. */
export interface CollectionSchema {
  /** The entry field holding the default description. */
  descriptionFieldKey?: string;
  /** Each record may replace an entry's title and description. */
  allowOverrides?: boolean;
  /** The public fields entries of this collection carry. */
  fields: readonly FieldDisplayDefinition[];
  /** Fields that hold the entry's logo (rendered as the logo, not a detail). */
  logoFieldKeys: ReadonlySet<string>;
  /** Per-record details or repeatable rows are defined (company only). */
  hasSelectionDetails?: boolean;
}

/**
 * Compact when entries can carry nothing but a title and a logo; rich when
 * they can carry a description (a default description field, or per-record
 * wording the operator allows), other public fields, or per-record details.
 * Decided from the definition and field schema, never from values, so one
 * collection places the same way on every page.
 */
export function collectionSizeClass(
  schema: CollectionSchema,
): 'compact' | 'rich' {
  if (schema.descriptionFieldKey || schema.allowOverrides) return 'rich';
  if (schema.hasSelectionDetails) return 'rich';
  const other = schema.fields.some(
    (field) =>
      field.key !== schema.descriptionFieldKey &&
      !schema.logoFieldKeys.has(field.key),
  );
  return other ? 'rich' : 'compact';
}

// ── Values ───────────────────────────────────────────────────────────────

/**
 * A stored value as the API sends it: text, a number, a boolean, option
 * keys, or media metadata (`{ id, name, contentType, sizeBytes, url }`, one
 * object or a list). Job and company scalar values are a subset.
 */
export type StoredValue = JobCollectionEntry['values'][string];
type MediaMetadata = Extract<StoredValue, { url: string }>;
type StoredValues = Readonly<Partial<Record<string, StoredValue>>>;

function isMedia(
  value: StoredValue | string | undefined,
): value is MediaMetadata {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function safeMediaUrl(url: string): string | null {
  return /^https?:\/\//i.test(url) || url.startsWith('/') ? url : null;
}

/** The media objects of an image, gallery or file value, with a safe URL. */
function mediaList(value: StoredValue | undefined): MediaMetadata[] {
  const list: ReadonlyArray<StoredValue | string | undefined> = Array.isArray(
    value,
  )
    ? value
    : [value];
  return list.filter(
    (item): item is MediaMetadata =>
      isMedia(item) && safeMediaUrl(searchString(item.url) ?? '') !== null,
  );
}

/** An http(s) href for a stored URL, or `null` for anything else. */
function safeHttpHref(value: string): string | null {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // A bare domain ("example.com/team"): no scheme and no whitespace.
  if (/^[^\s/:]+\.[^\s/:]+(\/\S*)?$/.test(trimmed)) return `https://${trimmed}`;
  return null;
}

function fileSizeLabel(locale: string, bytes: number | undefined) {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return null;
  const [unit, amount] =
    bytes >= 1_000_000
      ? (['megabyte', bytes / 1_000_000] as const)
      : bytes >= 1_000
        ? (['kilobyte', bytes / 1_000] as const)
        : (['byte', bytes] as const);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return null;
  }
}

function listJoin(locale: string, values: string[]) {
  try {
    return new Intl.ListFormat(locale, {
      style: 'long',
      type: 'conjunction',
    }).format(values);
  } catch {
    return values.join(', ');
  }
}

function nonBlank(value: StoredValue | undefined): string | null {
  const text = searchString(value);
  return text !== undefined && text.trim() !== '' ? text : null;
}

/**
 * Resolve one stored value by its field type. Returns `null` for an empty or
 * unusable value (so the caller renders nothing). `0` and `false` are real
 * values. `references` carries the resolved rows of a reference field.
 */
export function resolveDetailValue(
  field: FieldDisplayDefinition,
  raw: StoredValue | undefined,
  format: DetailFieldFormat,
  references?: ReadonlyArray<{ name: string }>,
): DetailValue | null {
  if (raw === undefined && field.type !== 'reference') return null;
  const optionLabel = (key: string) => {
    const option = field.options?.find((o) => o.key === key);
    if (!option) return null;
    return format.optionLabel?.(field.key, option) ?? option.label;
  };
  switch (field.type) {
    case 'boolean':
      if (raw === true) return { kind: 'text', text: format.yesLabel };
      if (raw === false) return { kind: 'text', text: format.noLabel };
      return null;
    case 'number': {
      if (!Number.isFinite(raw)) return null;
      const number = Number(raw);
      let text: string;
      try {
        text = new Intl.NumberFormat(format.locale).format(number);
      } catch {
        text = String(number);
      }
      return { kind: 'text', text };
    }
    case 'date': {
      const value = nonBlank(raw);
      if (!value) return null;
      return { kind: 'text', text: formatDate(format.locale, value) ?? value };
    }
    case 'short_text':
    case 'long_text': {
      const text = nonBlank(raw);
      return text ? { kind: 'text', text } : null;
    }
    case 'rich_text': {
      // Sanitised HTML per the API contract. An HTML string of only empty
      // markup ("<p></p>") has no text; treat it as empty.
      const html = nonBlank(raw);
      if (!html || html.replace(/<[^>]*>/g, '').trim() === '') return null;
      return { kind: 'html', html };
    }
    case 'single_select': {
      const key = searchString(raw);
      const text = key === undefined ? null : optionLabel(key);
      return text ? { kind: 'text', text } : null;
    }
    case 'multi_select': {
      const keys: ReadonlyArray<string | MediaMetadata> = Array.isArray(raw)
        ? raw
        : [];
      const labels = keys
        .map((key) => {
          const text = searchString(key);
          return text === undefined ? null : optionLabel(text);
        })
        .filter((label): label is string => label !== null);
      return labels.length > 0
        ? { kind: 'text', text: listJoin(format.locale, labels) }
        : null;
    }
    case 'url': {
      const text = nonBlank(raw);
      if (!text) return null;
      const href = safeHttpHref(text);
      return href ? { kind: 'link', text, href } : { kind: 'text', text };
    }
    case 'email': {
      const text = nonBlank(raw)?.trim();
      if (!text) return null;
      return /^[^\s@]+@[^\s@]+$/.test(text)
        ? { kind: 'link', text, href: `mailto:${text}` }
        : { kind: 'text', text };
    }
    case 'phone': {
      const text = nonBlank(raw)?.trim();
      if (!text) return null;
      const dial = text.replace(/[^\d+]/g, '');
      return dial.length > 0
        ? { kind: 'link', text, href: `tel:${dial}` }
        : { kind: 'text', text };
    }
    case 'image':
    case 'image_gallery': {
      const media = mediaList(raw);
      if (media.length === 0) return null;
      return {
        kind: 'images',
        images: media.map((item, index) => ({
          url: item.url,
          alt:
            media.length === 1
              ? field.label
              : format.galleryImageAlt(field.label, index + 1, media.length),
        })),
      };
    }
    case 'file': {
      const media = mediaList(raw);
      if (media.length === 0) return null;
      return {
        kind: 'files',
        files: media.map((item) => ({
          url: item.url,
          name: nonBlank(item.name) ?? field.label,
          sizeLabel: fileSizeLabel(format.locale, item.sizeBytes),
        })),
      };
    }
    case 'reference': {
      const names = (references ?? [])
        .map((row) => nonBlank(row.name))
        .filter((name): name is string => name !== null);
      return names.length > 0
        ? { kind: 'text', text: listJoin(format.locale, names) }
        : null;
    }
    default:
      return null;
  }
}

// ── Zone assembly ────────────────────────────────────────────────────────

function emptyZones(): DetailFieldZones {
  return {
    facts: [],
    prose: [],
    media: [],
    documents: [],
    compactCollections: [],
    richCollections: [],
  };
}

/** Place one scalar field's resolved value into its zone. */
function placeScalar(
  zones: DetailFieldZones,
  field: FieldDisplayDefinition,
  raw: StoredValue | undefined,
  format: DetailFieldFormat,
) {
  const sizeClass = scalarSizeClass(field.type);
  if (!sizeClass) return;
  const label = format.fieldLabel?.(field) ?? field.label;
  const value = resolveDetailValue({ ...field, label }, raw, format);
  if (!value) return;
  if (sizeClass === 'fact' || sizeClass === 'prose') {
    zones[sizeClass === 'fact' ? 'facts' : 'prose'].push({
      key: field.key,
      label,
      value,
    });
  } else if (value.kind === 'images') {
    zones.media.push({
      key: field.key,
      label,
      layout: field.type === 'image' ? 'figure' : 'gallery',
      images: value.images,
    });
  } else if (value.kind === 'files') {
    zones.documents.push({ key: field.key, label, files: value.files });
  }
}

/** Every public field entries of a collection carry, first seen first. */
function unionFields(
  lists: ReadonlyArray<readonly FieldDisplayDefinition[]>,
): FieldDisplayDefinition[] {
  const seen = new Map<string, FieldDisplayDefinition>();
  for (const list of lists)
    for (const field of list)
      if (!seen.has(field.key)) seen.set(field.key, field);
  return [...seen.values()];
}

/**
 * The image fields that hold an entry's logo: the collection's only image
 * field, or any image field whose value is the entry's `logoUrl`. The logo
 * renders once, as the logo, never again as a detail.
 */
function logoFieldKeys(
  fields: readonly FieldDisplayDefinition[],
  entries: ReadonlyArray<{
    logoUrl?: string | null;
    values: StoredValues;
  }>,
): Set<string> {
  const images = fields.filter((field) => field.type === 'image');
  if (images.length === 1) return new Set([images[0]!.key]);
  const keys = new Set<string>();
  for (const field of images) {
    if (
      entries.some((entry) => {
        const value = entry.values[field.key];
        return Boolean(
          entry.logoUrl && isMedia(value) && value.url === entry.logoUrl,
        );
      })
    )
      keys.add(field.key);
  }
  return keys;
}

function entryLogo(
  logoUrl: string | null | undefined,
  values: StoredValues,
  logoKeys: ReadonlySet<string>,
): string | null {
  if (logoUrl) return safeMediaUrl(logoUrl);
  for (const key of logoKeys) {
    const value = values[key];
    const url = isMedia(value)
      ? safeMediaUrl(searchString(value.url) ?? '')
      : null;
    if (url) return url;
  }
  return null;
}

function entryDetails(
  fields: readonly FieldDisplayDefinition[],
  schema: CollectionSchema,
  values: StoredValues,
  references: Record<string, ReadonlyArray<{ name: string }>> | undefined,
  format: DetailFieldFormat,
): DetailField[] {
  return fields.flatMap((field) => {
    if (field.key === schema.descriptionFieldKey) return [];
    if (schema.logoFieldKeys.has(field.key)) return [];
    const value = resolveDetailValue(
      field,
      values[field.key],
      format,
      references?.[field.key],
    );
    return value ? [{ key: field.key, label: field.label, value }] : [];
  });
}

function entryDescription(
  description: string | null | undefined,
  isHtml: boolean,
): DetailCollectionEntry['description'] {
  const text = nonBlank(description ?? undefined);
  if (!text) return null;
  if (isHtml) {
    return text.replace(/<[^>]*>/g, '').trim() === ''
      ? null
      : { kind: 'html', html: text };
  }
  return { kind: 'text', text };
}

function placeCollection(
  zones: DetailFieldZones,
  collection: DetailCollection,
  sizeClass: 'compact' | 'rich',
) {
  if (collection.entries.length === 0) return;
  if (sizeClass === 'compact') {
    zones.compactCollections.push({
      ...collection,
      entries: collection.entries.map((entry) => ({
        ...entry,
        description: null,
        details: [],
        rows: [],
      })),
    });
  } else {
    zones.richCollections.push(collection);
  }
}

/**
 * The custom and collection entries of a form layout the operator shows, in
 * order. The same rule the forms apply (`visible: false` is never rendered),
 * kept local so the public detail pages do not load the form modules.
 */
function shownFields<TField extends { kind: string; visible: boolean }>(
  layout: readonly TField[],
): TField[] {
  return layout.filter((field) => field.visible && field.kind !== 'builtin');
}

// ── Job ──────────────────────────────────────────────────────────────────

/** The board context, as far as job detail placement needs it. */
export interface JobDetailFieldsSource {
  forms?: { job?: readonly BoardJobFormField[] | null } | null;
  customFields?: {
    jobCollections?: readonly JobCollectionFieldDefinition[] | null;
  } | null;
}

type JobCollectionField = PublicJob['resolvedCollectionFields'][number];
type JobCollectionEntry = JobCollectionField['entries'][number];

/**
 * A job's custom fields and collection selections, placed by size class, in
 * the order of the operator's job form (`forms.job`).
 */
export function jobDetailFields(
  job: Pick<PublicJob, 'customFieldValues' | 'resolvedCollectionFields'>,
  customFields: readonly CustomFieldDefinition[],
  source: JobDetailFieldsSource | null | undefined,
  format: DetailFieldFormat,
): DetailFieldZones {
  const zones = emptyZones();
  const values: StoredValues = job.customFieldValues ?? {};
  const resolved = new Map(
    (job.resolvedCollectionFields ?? []).map((field) => [field.key, field]),
  );
  const listed = new Set<string>();

  const placeJobCollection = (
    field: JobCollectionField,
    definition: {
      label?: string;
      descriptionFieldKey?: string;
      allowOverrides?: boolean;
    } | null,
  ) => {
    const fields = unionFields(field.entries.map((entry) => entry.fields));
    const schema: CollectionSchema = {
      descriptionFieldKey: definition?.descriptionFieldKey,
      allowOverrides: definition?.allowOverrides,
      fields,
      logoFieldKeys: logoFieldKeys(fields, field.entries),
    };
    // Per the API, `description` is HTML only when the collection's default
    // description field is rich text.
    const descriptionIsHtml =
      fields.find((f) => f.key === schema.descriptionFieldKey)?.type ===
      'rich_text';
    placeCollection(
      zones,
      {
        key: field.key,
        label: definition?.label || field.label,
        entries: field.entries.map((entry: JobCollectionEntry) => ({
          id: entry.id,
          title: entry.title,
          logoUrl: entryLogo(entry.logoUrl, entry.values, schema.logoFieldKeys),
          description: entryDescription(entry.description, descriptionIsHtml),
          details: entryDetails(
            fields,
            schema,
            entry.values,
            entry.references,
            format,
          ),
          rows: [],
        })),
      },
      collectionSizeClass(schema),
    );
  };

  const layout = source?.forms?.job;
  if (Array.isArray(layout)) {
    for (const entry of shownFields(layout)) {
      if (entry.kind === 'custom') {
        placeScalar(zones, entry.definition, values[entry.key], format);
      } else if (entry.kind === 'collection') {
        const field = resolved.get(entry.key);
        if (field) placeJobCollection(field, entry.definition);
      }
    }
    return zones;
  }

  // An API that predates `forms`: definition order, custom fields first,
  // then collection fields. One that also predates
  // `customFields.jobCollections` still resolves selections, so those follow
  // in the order returned.
  for (const definition of customFields)
    placeScalar(zones, definition, values[definition.key], format);
  for (const definition of source?.customFields?.jobCollections ?? []) {
    listed.add(definition.key);
    const field = resolved.get(definition.key);
    if (field) placeJobCollection(field, definition);
  }
  for (const field of resolved.values())
    if (!listed.has(field.key)) placeJobCollection(field, null);
  return zones;
}

// ── Company ──────────────────────────────────────────────────────────────

type CompanySelection = PublicCompanyDetail['objectReferences'][number];

/** Per-selection detail definitions the public page may show. */
function publicDefinitions<TField extends { visibility: string }>(
  fields: readonly TField[],
): TField[] {
  return fields.filter((field) => field.visibility === 'public');
}
type ProfileCollectionDefinition = Extract<
  BoardProfileFormField,
  { kind: 'collection' }
>['definition'];

/**
 * A company's custom fields and collection selections, placed by size class,
 * in the order of the operator's company form (`forms.company`). Without a
 * layout the scalar fields have no public definitions to label or type them
 * with, so only the collection selections render, grouped by field in the
 * order the API returns them.
 */
export function companyDetailFields(
  company: Pick<PublicCompanyDetail, 'customFieldValues' | 'objectReferences'>,
  layout: readonly BoardProfileFormField[] | null | undefined,
  format: DetailFieldFormat,
): DetailFieldZones {
  const zones = emptyZones();
  const values: StoredValues = company.customFieldValues ?? {};
  const selections = company.objectReferences ?? [];

  const placeCompanyCollection = (
    key: string,
    definition: ProfileCollectionDefinition | null,
  ) => {
    const chosen = selections.filter((s) => s.fieldKey === key);
    if (chosen.length === 0) return;
    const fields = unionFields(chosen.map((s) => s.fields));
    const first = chosen[0]!;
    const schema: CollectionSchema = {
      descriptionFieldKey:
        definition?.descriptionFieldKey ?? first.descriptionFieldKey,
      allowOverrides: definition?.allowOverrides,
      fields,
      logoFieldKeys: logoFieldKeys(
        fields,
        chosen.map((s) => ({ logoUrl: s.logoUrl, values: s.attributes })),
      ),
      hasSelectionDetails: chosen.some(
        (s) =>
          publicDefinitions(s.valueDefinitions).length > 0 ||
          publicDefinitions(s.entryDefinitions).length > 0,
      ),
    };
    placeCollection(
      zones,
      {
        key,
        label: definition?.label || first.fieldLabel,
        entries: chosen.map((selection: CompanySelection) => ({
          id: selection.recordId,
          title: selection.title,
          logoUrl: entryLogo(
            selection.logoUrl,
            selection.attributes,
            schema.logoFieldKeys,
          ),
          description: entryDescription(
            selection.description,
            selection.descriptionType === 'rich_text',
          ),
          details: [
            ...entryDetails(
              fields,
              schema,
              selection.attributes,
              selection.references,
              format,
            ),
            ...publicDefinitions(selection.valueDefinitions).flatMap(
              (field) => {
                if (!field.type) return [];
                const value = resolveDetailValue(
                  { ...field, type: field.type },
                  selection.values[field.key],
                  format,
                );
                return value
                  ? [{ key: field.key, label: field.label, value }]
                  : [];
              },
            ),
          ],
          rows: selection.entries
            .map((row) =>
              publicDefinitions(selection.entryDefinitions).flatMap((field) => {
                if (!field.type) return [];
                const value = resolveDetailValue(
                  { ...field, type: field.type },
                  row.values[field.key],
                  format,
                );
                return value
                  ? [
                      {
                        key: `${row.key}:${field.key}`,
                        label: field.label,
                        value,
                      },
                    ]
                  : [];
              }),
            )
            .filter((row) => row.length > 0),
        })),
      },
      collectionSizeClass(schema),
    );
  };

  if (Array.isArray(layout)) {
    for (const entry of shownFields(layout)) {
      if (entry.kind === 'custom') {
        if (entry.definition.visibility !== 'public') continue;
        placeScalar(zones, entry.definition, values[entry.key], format);
      } else if (entry.kind === 'collection') {
        if (entry.definition.visibility !== 'public') continue;
        placeCompanyCollection(entry.key, entry.definition);
      }
    }
    return zones;
  }

  const keys = [...new Set(selections.map((s) => s.fieldKey))];
  for (const key of keys) placeCompanyCollection(key, null);
  return zones;
}
