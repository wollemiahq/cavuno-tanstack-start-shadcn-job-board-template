/**
 * The operator's form layouts from `board.context().forms`: the job,
 * company and talent forms as ordered field lists (Settings → Job form,
 * Company profile, Talent profile). Each form renders its list top to
 * bottom: built-ins by `key` with the starter's own controls, custom and
 * collection fields from their inlined `definition`.
 *
 * The rules every form shares live here so the three cannot drift:
 *
 *   - an entry with `visible: false` is not rendered and never required;
 *   - a locked built-in is always shown and always required;
 *   - a built-in key or an entry kind this starter does not know is
 *     skipped (the API may add them before the starter learns to draw
 *     them);
 *   - an API deployment that predates `forms` falls back to the order these
 *     forms rendered before layouts existed, so an older board keeps working.
 *
 * The server enforces the same visibility and required rules, so this is
 * about showing the right fields and catching a missing answer before the
 * round trip, not about authority.
 */

import {
  resolveJobForm,
  resolveJobFormConstraints,
  type JobFormConstraints,
  type JobFormSource,
} from './job-form';

import type {
  BoardJobFormField,
  BoardProfileFormField,
  CustomFieldDefinition,
  ProfileFieldValues,
  ProfileObjectReferences,
  PublicBoard,
} from '@cavuno/board';

/** A job collection field definition, as the job form layout inlines it. */
export type JobCollectionDefinition = Extract<
  BoardJobFormField,
  { kind: 'collection' }
>['definition'];
/** A company or talent custom field definition (owner or public read). */
export type ProfileCustomDefinition = ProfileFieldValues['definitions'][number];
/** A company or talent collection field definition (owner or public read). */
export type ProfileCollectionDefinition =
  ProfileObjectReferences['definitions'][number];

/** One chosen or choosable collection entry: its record id and display name. */
export type CollectionChoice = { id: string; name: string };

/** One field to render, in order. Hidden fields never become entries. */
export type FormLayoutEntry<TBuiltin extends string, TCustom, TCollection> =
  | { kind: 'builtin'; key: TBuiltin; required: boolean; locked: boolean }
  | { kind: 'custom'; key: string; required: boolean; definition: TCustom }
  | {
      kind: 'collection';
      key: string;
      required: boolean;
      definition: TCollection;
    };

/** One entry of a layout list as the API sends it. */
type LayoutField<TCustom, TCollection> =
  | {
      kind: 'builtin';
      key: string;
      visible: boolean;
      required: boolean;
      locked: boolean;
    }
  | {
      kind: 'custom';
      key: string;
      visible: boolean;
      required: boolean;
      definition: TCustom;
    }
  | {
      kind: 'collection';
      key: string;
      visible: boolean;
      required: boolean;
      definition: TCollection;
    };

/** Visible entries of a layout list, in order, with locks applied. */
function visibleEntries<TBuiltin extends string, TCustom, TCollection>(
  layout: ReadonlyArray<LayoutField<TCustom, TCollection>>,
  builtins: readonly TBuiltin[],
): FormLayoutEntry<TBuiltin, TCustom, TCollection>[] {
  const seen = new Set<string>();
  const entries: FormLayoutEntry<TBuiltin, TCustom, TCollection>[] = [];
  for (const field of layout) {
    const id = `${field.kind}:${field.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    if (field.kind === 'builtin') {
      const key = builtins.find((candidate) => candidate === field.key);
      if (!key) continue;
      // A locked built-in is always shown and required, whatever else the
      // entry says.
      if (!field.visible && !field.locked) continue;
      entries.push({
        kind: 'builtin',
        key,
        required: field.locked || field.required,
        locked: field.locked,
      });
      continue;
    }
    if (!field.visible) continue;
    if (field.kind === 'custom') {
      entries.push({
        kind: 'custom',
        key: field.key,
        required: field.required,
        definition: field.definition,
      });
    } else if (field.kind === 'collection') {
      entries.push({
        kind: 'collection',
        key: field.key,
        required: field.required,
        definition: field.definition,
      });
    }
    // Any other kind (one the API adds before the starter learns to draw
    // it) is skipped, like an unknown built-in key.
  }
  return entries;
}

/**
 * Split an ordered form into rows: consecutive entries that share a group
 * (employment type beside seniority, the social links) sit in one row, so a
 * form keeps its side-by-side pairs wherever the layout puts them. Entries
 * without a group, or whose neighbours are in another group, stand alone.
 */
export function layoutRows<TEntry>(
  entries: readonly TEntry[],
  groupOf: (entry: TEntry) => string | null,
): { group: string | null; entries: TEntry[] }[] {
  const rows: { group: string | null; entries: TEntry[] }[] = [];
  for (const entry of entries) {
    const group = groupOf(entry);
    const last = rows.at(-1);
    if (group !== null && last?.group === group) {
      last.entries.push(entry);
    } else {
      rows.push({ group, entries: [entry] });
    }
  }
  return rows;
}

/** A stable React key for an entry. */
export function formEntryKey(entry: { kind: string; key: string }): string {
  return `${entry.kind}:${entry.key}`;
}

/** Whether the resolved form shows a built-in. */
export function showsBuiltin(
  entries: ReadonlyArray<{ kind: string; key: string }>,
  key: string,
): boolean {
  return entries.some((entry) => entry.kind === 'builtin' && entry.key === key);
}

/** Whether the resolved form shows a built-in and requires it. */
export function requiresBuiltin(
  entries: ReadonlyArray<{ kind: string; key: string; required: boolean }>,
  key: string,
): boolean {
  return entries.some(
    (entry) => entry.kind === 'builtin' && entry.key === key && entry.required,
  );
}

/**
 * The board context's `forms`, or `null` from an API deployment that
 * predates it (the SDK types it as always present; an older API omits it).
 */
export function boardForms(board: {
  forms?: PublicBoard['forms'] | null;
}): PublicBoard['forms'] | null {
  return board.forms ?? null;
}

// ── Job ──────────────────────────────────────────────────────────────────

/**
 * The job form's built-ins, in the order the starter's job forms rendered
 * them before layouts existed (the fallback order). `company` is the
 * poster's company block on the public form; the employer form posts for
 * its own company and has no input for it.
 */
export const JOB_FORM_BUILTINS = [
  'company',
  'employmentType',
  'seniority',
  'title',
  'workArrangement',
  'location',
  'remoteEligibility',
  'description',
  'salary',
  'applyMethod',
] as const;

export type JobFormBuiltinKey = (typeof JOB_FORM_BUILTINS)[number];

export type JobFormEntry = FormLayoutEntry<
  JobFormBuiltinKey,
  CustomFieldDefinition,
  JobCollectionDefinition
>;

/**
 * The board context as far as the job form: the legacy `jobForm` group
 * (visibility, allow-lists, bounds), the `forms` layout and the collection
 * field definitions. All optional, so a board context from an older API
 * still resolves.
 */
export type JobFormLayoutSource = JobFormSource & {
  forms?: { job?: readonly BoardJobFormField[] | null } | null;
  customFields?: {
    jobCollections?: readonly JobCollectionDefinition[] | null;
  } | null;
};

/**
 * The job form to render, in order. With a layout, that is the layout's
 * visible entries. Without one (an API that predates `forms`), it is the
 * pre-layout order: every built-in the legacy `jobForm` group leaves
 * visible, then the board's custom fields, then any collection fields.
 */
export function resolveJobFormLayout(
  source: JobFormLayoutSource | null | undefined,
  customFields: readonly CustomFieldDefinition[],
): JobFormEntry[] {
  const layout = source?.forms?.job;
  if (Array.isArray(layout)) {
    return visibleEntries<
      JobFormBuiltinKey,
      CustomFieldDefinition,
      JobCollectionDefinition
    >(layout, JOB_FORM_BUILTINS);
  }

  const visibility = resolveJobForm(source);
  const constraints = resolveJobFormConstraints(source);
  const hidden = new Set<JobFormBuiltinKey>();
  if (!visibility.seniority.visible) hidden.add('seniority');
  if (!visibility.location.visible) hidden.add('location');
  if (!visibility.salary.visible) hidden.add('salary');
  const required = new Set<JobFormBuiltinKey>([
    'company',
    'title',
    'workArrangement',
    'description',
    'applyMethod',
  ]);
  if (constraints.seniority.required) required.add('seniority');
  if (constraints.salary.required) required.add('salary');

  return [
    ...JOB_FORM_BUILTINS.filter((key) => !hidden.has(key)).map(
      (key): JobFormEntry => ({
        kind: 'builtin',
        key,
        required: required.has(key),
        locked: false,
      }),
    ),
    ...customFields.map(
      (definition): JobFormEntry => ({
        kind: 'custom',
        key: definition.key,
        required: definition.required,
        definition,
      }),
    ),
    ...(source?.customFields?.jobCollections ?? []).map(
      (definition): JobFormEntry => ({
        kind: 'collection',
        key: definition.key,
        required: definition.required,
        definition,
      }),
    ),
  ];
}

/**
 * The legacy constraints with visibility and required state taken from the
 * resolved layout, so the existing salary / seniority / location checks
 * follow what the form actually renders. Allow-lists and bounds still come
 * from `jobForm`, which the layout does not carry.
 */
export function jobFormConstraintsForLayout(
  source: JobFormLayoutSource | null | undefined,
  entries: readonly JobFormEntry[],
): JobFormConstraints {
  const constraints = resolveJobFormConstraints(source);
  return {
    ...constraints,
    salary: {
      ...constraints.salary,
      visible: showsBuiltin(entries, 'salary'),
      required: requiresBuiltin(entries, 'salary'),
    },
    seniority: {
      ...constraints.seniority,
      visible: showsBuiltin(entries, 'seniority'),
      required: requiresBuiltin(entries, 'seniority'),
    },
    location: {
      ...constraints.location,
      visible: showsBuiltin(entries, 'location'),
    },
  };
}

/**
 * The custom field definitions a job layout renders, in layout order, with
 * `required` taken from the layout (a hidden field is never required).
 */
export function jobLayoutCustomFields(
  entries: readonly JobFormEntry[],
): CustomFieldDefinition[] {
  return entries.flatMap((entry) =>
    entry.kind === 'custom'
      ? [{ ...entry.definition, required: entry.required }]
      : [],
  );
}

/**
 * The collection field definitions a job layout renders, in layout order,
 * with `required` taken from the layout.
 */
export function jobLayoutCollectionFields(
  entries: readonly JobFormEntry[],
): JobCollectionDefinition[] {
  return entries.flatMap((entry) =>
    entry.kind === 'collection'
      ? [{ ...entry.definition, required: entry.required }]
      : [],
  );
}

// ── Company and talent ──────────────────────────────────────────────────

/** Company profile built-ins, in the starter's pre-layout order. */
export const COMPANY_FORM_BUILTINS = [
  'logo',
  'name',
  'website',
  'summary',
  'linkedinUrl',
  'xUrl',
  'facebookUrl',
  'description',
] as const;

export type CompanyFormBuiltinKey = (typeof COMPANY_FORM_BUILTINS)[number];

/**
 * Talent profile built-ins, in the starter's pre-layout order. `email` is
 * listed so the key is recognised, but the profile page has no email input:
 * the address changes on the settings page, through a verified flow.
 */
export const TALENT_FORM_BUILTINS = [
  'avatar',
  'name',
  'email',
  'headline',
  'location',
  'bio',
  'jobSearchStatus',
  'experience',
  'education',
  'skills',
  'languages',
] as const;

export type TalentFormBuiltinKey = (typeof TALENT_FORM_BUILTINS)[number];

export type ProfileFormEntry<TBuiltin extends string> = FormLayoutEntry<
  TBuiltin,
  ProfileCustomDefinition,
  ProfileCollectionDefinition
>;

/**
 * The signed-in owner's own definitions (`retrieveCustomFields` and
 * `retrieveObjectReferences`). They include private owner-editable fields,
 * which the public layout never lists.
 */
export type OwnerProfileDefinitions = {
  customFields: readonly ProfileCustomDefinition[];
  collectionFields: readonly ProfileCollectionDefinition[];
};

/**
 * The owner definitions from the two owner reads, or `null` when neither
 * answered (an older API, or a failed read). A read that did not answer
 * contributes no definitions, so its fields are left out of the form.
 */
export function ownerProfileDefinitions(
  fields:
    | {
        customFields: ProfileFieldValues | null;
        objectReferences: ProfileObjectReferences | null;
      }
    | null
    | undefined,
): OwnerProfileDefinitions | null {
  if (!fields?.customFields && !fields?.objectReferences) return null;
  return {
    customFields: fields.customFields?.definitions ?? [],
    collectionFields: fields.objectReferences?.definitions ?? [],
  };
}

/**
 * A company or talent form to render, in order. Custom and collection
 * fields become inputs only when the owner may edit them. With a layout,
 * its visible entries come first, in order, then the owner's private
 * editable fields the public layout cannot list. Without a layout, the
 * built-ins render in the pre-layout order, followed by the owner's
 * editable fields in the order the API returns them.
 */
export function resolveProfileFormLayout<TBuiltin extends string>(
  layout: readonly BoardProfileFormField[] | null | undefined,
  builtins: readonly TBuiltin[],
  owner: OwnerProfileDefinitions | null,
  options: {
    /** Built-ins the fallback form requires (the pre-layout `required`s). */
    fallbackRequired?: readonly TBuiltin[];
    /** Where collection fields go in the fallback, relative to custom ones. */
    fallbackCollectionsFirst?: boolean;
  } = {},
): ProfileFormEntry<TBuiltin>[] {
  const ownerCustom = new Map(
    (owner?.customFields ?? []).map((definition) => [
      definition.key,
      definition,
    ]),
  );
  const ownerCollections = new Map(
    (owner?.collectionFields ?? []).map((definition) => [
      definition.key,
      definition,
    ]),
  );

  // The owner's editable fields the layout does not list (private ones).
  const unlisted = (listed: ReadonlySet<string>) => {
    const custom = [...ownerCustom.values()]
      .filter(
        (definition) =>
          definition.editableByOwner && !listed.has(`custom:${definition.key}`),
      )
      .map(
        (definition): ProfileFormEntry<TBuiltin> => ({
          kind: 'custom',
          key: definition.key,
          required: definition.required,
          definition,
        }),
      );
    const collections = [...ownerCollections.values()]
      .filter(
        (definition) =>
          definition.editableByOwner &&
          !listed.has(`collection:${definition.key}`),
      )
      .map(
        (definition): ProfileFormEntry<TBuiltin> => ({
          kind: 'collection',
          key: definition.key,
          required: definition.required === true,
          definition,
        }),
      );
    return options.fallbackCollectionsFirst
      ? [...collections, ...custom]
      : [...custom, ...collections];
  };

  if (!Array.isArray(layout)) {
    const required = new Set<string>(options.fallbackRequired ?? []);
    return [
      ...builtins.map(
        (key): ProfileFormEntry<TBuiltin> => ({
          kind: 'builtin',
          key,
          required: required.has(key),
          locked: false,
        }),
      ),
      ...unlisted(new Set()),
    ];
  }

  // Every key the layout mentions, shown or hidden: a public field the
  // operator hid stays hidden rather than resurfacing as a "private" one.
  const listed = new Set(layout.map(formEntryKey));
  const entries = visibleEntries<
    TBuiltin,
    ProfileCustomDefinition,
    ProfileCollectionDefinition
  >(layout, builtins).flatMap((entry): ProfileFormEntry<TBuiltin>[] => {
    if (entry.kind === 'builtin') return [entry];
    // Only the owner's definition makes an input: it is what the write
    // endpoints validate against, and the owner read carries the stored
    // answers. Without it the field is left out rather than drawn empty,
    // since saving an empty collection picker would replace the stored
    // selections.
    if (entry.kind === 'custom') {
      const definition = ownerCustom.get(entry.key);
      return definition?.editableByOwner ? [{ ...entry, definition }] : [];
    }
    const definition = ownerCollections.get(entry.key);
    return definition?.editableByOwner ? [{ ...entry, definition }] : [];
  });
  return [...entries, ...unlisted(listed)];
}
