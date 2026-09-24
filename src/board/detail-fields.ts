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
 *
 * A collection selection renders one of three ways, decided only by whether
 * its shown entries carry a public description or a logo (see
 * `collectionPresentation`):
 *
 *   - list    an entry has a description → logo, bold title and a short
 *             description per entry, in the main column
 *   - tiles   no description, but an entry has a logo → a grid of equal
 *             logo + name tiles, in the main column; an entry without a
 *             logo gets a neutral initial tile of the same size
 *   - chips   neither → name chips, in the main column on both pages
 *             whatever the number of selections
 *
 * None shows an entry's other fields (selects, numbers, references,
 * per-selection details): a detail page previews what was chosen; it is not
 * the collection's record view. The one use of those fields is grouping: the
 * expanded view of a long collection sorts entries under subheadings by the
 * first single-valued categorising field (see `collectionGroups`).
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

/** A labelled value: a fact row or a prose section. */
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
  /** The title to show: on a job, the job's own wording when it set one. */
  title: string;
  logoUrl: string | null;
  /**
   * List collections only (always `null` in tiles and chips); `null` when
   * the entry has none. On a job, the job's own wording when it set one.
   */
  description: Extract<DetailValue, { kind: 'text' | 'html' }> | null;
}

/** A subheading of a collection's expanded view and the entries under it. */
export interface DetailCollectionGroup {
  key: string;
  label: string;
  entries: DetailCollectionEntry[];
}

export interface DetailCollection {
  key: string;
  label: string;
  entries: DetailCollectionEntry[];
  /**
   * The entries grouped for the expanded view, or `null` when the collection
   * has no categorising field (the expanded view is then the flat list).
   */
  groups: DetailCollectionGroup[] | null;
}

export interface DetailFieldZones {
  facts: DetailField[];
  prose: DetailField[];
  media: DetailMedia[];
  documents: DetailDocuments[];
  listCollections: DetailCollection[];
  tileCollections: DetailCollection[];
  chipCollections: DetailCollection[];
}

export const EMPTY_DETAIL_FIELDS: DetailFieldZones = {
  facts: [],
  prose: [],
  media: [],
  documents: [],
  listCollections: [],
  tileCollections: [],
  chipCollections: [],
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
  /** The group for entries without a category in a grouped collection. */
  otherGroupLabel: string;
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

export type CollectionPresentation = 'list' | 'tiles' | 'chips';

/**
 * How a collection renders, from the entries being rendered only:
 *
 *   - list    an entry has a public description (the default description
 *             field's value, or on a job its own wording)
 *   - tiles   no description, and an entry has a logo (the API's `logoUrl`:
 *             the image in the collection's logo field, or the collection's
 *             only image field when the API sent none)
 *   - chips   neither
 *
 * The API does not say which field is a collection's logo field, so "the
 * collection has a logo" is read from the entries: one logo is enough, and
 * the entries without one get an initial tile. Nothing else decides it:
 * references, selects, other entry fields and per-selection details never
 * change the presentation.
 */
export function collectionPresentation(
  entries: ReadonlyArray<
    Pick<DetailCollectionEntry, 'description' | 'logoUrl'>
  >,
): CollectionPresentation {
  if (entries.some((entry) => entry.description !== null)) return 'list';
  if (entries.some((entry) => entry.logoUrl !== null)) return 'tiles';
  return 'chips';
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
 * values.
 */
export function resolveDetailValue(
  field: FieldDisplayDefinition,
  raw: StoredValue | undefined,
  format: DetailFieldFormat,
): DetailValue | null {
  if (raw === undefined) return null;
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
        // No grouping below 10,000, so a year reads "2016", not "2,016";
        // larger numbers keep the locale's grouping.
        text = new Intl.NumberFormat(format.locale, {
          useGrouping: Math.abs(number) >= 10_000,
        }).format(number);
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
    listCollections: [],
    tileCollections: [],
    chipCollections: [],
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
 * The image fields that can hold an entry's logo: the collection's only
 * image field, or any image field whose value is the entry's `logoUrl`.
 * Used when an entry has no `logoUrl` of its own.
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
) {
  if (collection.entries.length === 0) return;
  const zone = {
    list: 'listCollections',
    tiles: 'tileCollections',
    chips: 'chipCollections',
  } as const;
  zones[zone[collectionPresentation(collection.entries)]].push(collection);
}

// ── Grouping ─────────────────────────────────────────────────────────────

/** What grouping reads from one raw entry: its values and resolved references. */
interface CollectionGroupingSource {
  values: StoredValues;
  references?: Readonly<
    Partial<Record<string, ReadonlyArray<{ id: string; name: string }>>>
  >;
}

/** The one category an entry has under `field`, or `null` for none. */
function entryCategory(
  field: FieldDisplayDefinition,
  source: CollectionGroupingSource,
): { key: string; label: string } | null {
  if (field.type === 'single_select') {
    const key = searchString(source.values[field.key]);
    const option = field.options?.find((o) => o.key === key);
    return option ? { key: option.key, label: option.label } : null;
  }
  const rows = source.references?.[field.key] ?? [];
  const name = rows.length === 1 ? nonBlank(rows[0]!.name) : null;
  return name ? { key: rows[0]!.id, label: name } : null;
}

/**
 * The field the expanded view groups by: the first public entry field that
 * gives each entry at most one category (a single select, or a reference no
 * entry uses for more than one record) and that at least one entry fills.
 */
function groupingField(
  fields: readonly FieldDisplayDefinition[],
  sources: readonly CollectionGroupingSource[],
): FieldDisplayDefinition | null {
  return (
    fields.find((field) => {
      if (field.type === 'reference') {
        const counts = sources.map((s) => s.references?.[field.key]?.length);
        if (counts.some((count) => (count ?? 0) > 1)) return false;
      } else if (field.type !== 'single_select') {
        return false;
      }
      return sources.some((source) => entryCategory(field, source) !== null);
    }) ?? null
  );
}

/**
 * A collection's entries under subheadings for its expanded view, by the
 * first single-valued categorising field (see `groupingField`): a single
 * select groups by option label in option order, a reference by the
 * referenced entry's name in order of first appearance. Entries without a
 * category follow under `otherLabel`. `null` when no field categorises the
 * entries; the expanded view is then the flat list. `sources[i]` is the raw
 * entry behind `entries[i]`.
 */
function collectionGroups(
  fields: readonly FieldDisplayDefinition[],
  entries: readonly DetailCollectionEntry[],
  sources: readonly CollectionGroupingSource[],
  otherLabel: string,
): DetailCollectionGroup[] | null {
  const field = groupingField(fields, sources);
  if (!field) return null;
  const groups = new Map<string, DetailCollectionGroup>();
  const groupFor = (category: { key: string; label: string }) => {
    let group = groups.get(category.key);
    if (!group) {
      group = {
        key: `category:${category.key}`,
        label: category.label,
        entries: [],
      };
      groups.set(category.key, group);
    }
    return group;
  };
  // A single select's groups follow its option order, empty ones dropped.
  if (field.type === 'single_select')
    for (const option of field.options ?? []) groupFor(option);
  const other: DetailCollectionGroup = {
    key: 'other',
    label: otherLabel,
    entries: [],
  };
  entries.forEach((entry, index) => {
    const source = sources[index];
    const category = source ? entryCategory(field, source) : null;
    (category ? groupFor(category) : other).entries.push(entry);
  });
  return [...groups.values(), other].filter(
    (group) => group.entries.length > 0,
  );
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
    definition: { label?: string; descriptionFieldKey?: string } | null,
  ) => {
    const fields = unionFields(field.entries.map((entry) => entry.fields));
    const logoKeys = logoFieldKeys(fields, field.entries);
    // Per the API, `description` is HTML only when the collection's default
    // description field is rich text. `title` and `description` already
    // carry the job's own wording when it set one.
    const descriptionIsHtml =
      fields.find((f) => f.key === definition?.descriptionFieldKey)?.type ===
      'rich_text';
    const entries = field.entries.map(
      (entry: JobCollectionEntry): DetailCollectionEntry => ({
        id: entry.id,
        title: entry.title,
        logoUrl: entryLogo(entry.logoUrl, entry.values, logoKeys),
        description: entryDescription(entry.description, descriptionIsHtml),
      }),
    );
    placeCollection(zones, {
      key: field.key,
      label: definition?.label || field.label,
      entries,
      groups: collectionGroups(
        fields,
        entries,
        field.entries,
        format.otherGroupLabel,
      ),
    });
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
    const logoKeys = logoFieldKeys(
      fields,
      chosen.map((s) => ({ logoUrl: s.logoUrl, values: s.attributes })),
    );
    const entries = chosen.map(
      (selection: CompanySelection): DetailCollectionEntry => ({
        id: selection.recordId,
        title: selection.title,
        logoUrl: entryLogo(selection.logoUrl, selection.attributes, logoKeys),
        description: entryDescription(
          selection.description,
          selection.descriptionType === 'rich_text',
        ),
      }),
    );
    placeCollection(zones, {
      key,
      label: definition?.label || first.fieldLabel,
      entries,
      groups: collectionGroups(
        fields,
        entries,
        chosen.map((s) => ({ values: s.attributes, references: s.references })),
        format.otherGroupLabel,
      ),
    });
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
