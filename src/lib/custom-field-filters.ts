/**
 * Operator custom fields as listing filters — one path from a field
 * definition to a sheet control, a URL parameter and a Board API clause,
 * shared by the jobs, companies and talent directories.
 *
 * Which fields become filters:
 * - `single_select` and `multi_select` → a multi-choice list of the field's
 *   options. Several ticked options match any of them.
 * - `boolean` → one checkbox labelled with the field name. Ticked sends
 *   `values: [true]`; unticked sends nothing (there is no "no" filter).
 * - Everything else (number, text, dates, links, files, collection
 *   references) is left out, as are private profile fields.
 *
 * URL: each active field is one `cf.<field key>` parameter holding option
 * keys joined by commas (`cf.work_style=async,flexible`), or `true` for a
 * checkbox field (`cf.four_day_week=true`). The `cf.` prefix keeps operator
 * keys from colliding with the built-in parameters.
 *
 * Reading is two-step. `parseCustomFieldSearch` runs in `validateSearch`,
 * where definitions are unknown, and only normalizes the shape.
 * `resolveCustomFieldFilters` then checks the parameters against the live
 * definitions and drops unknown keys, stale options and wrong types, so a
 * shared or outdated URL narrows what it still can and never produces an
 * `invalid_filter` error.
 */
import {
  searchNumber,
  searchString,
  type UrlSearchInput,
  type UrlSearchValue,
} from '@/lib/pagination';
import type { CustomFieldFilter } from '@cavuno/board';

export const CUSTOM_FIELD_PARAM_PREFIX = 'cf.';

/** Board API limits: clauses per request and values per clause. */
export const MAX_CUSTOM_FIELD_CLAUSES = 10;
export const MAX_CUSTOM_FIELD_VALUES = 10;

const FIELD_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export type CustomFieldParam = `cf.${string}`;

/** URL shape: option keys joined by commas, or `true` for a checkbox field. */
export type CustomFieldSearch = {
  [param: CustomFieldParam]: string | true | undefined;
};

/** A filter control built from one eligible field definition. */
export type CustomFilterField =
  | {
      kind: 'choice';
      key: string;
      label: string;
      options: Array<{ value: string; label: string }>;
    }
  | { kind: 'flag'; key: string; label: string };

/**
 * The definition shape shared by job custom fields
 * (`board.context().customFields.job`) and public profile fields
 * (`board.profileFields.retrieve(...)`). Profile definitions also carry a
 * `visibility`; job definitions are public by construction.
 */
export type CustomFieldDefinitionInput = {
  key: string;
  label: string;
  type: string;
  options?: Array<{ key: string; label: string }>;
  visibility?: string;
};

export type CustomFieldLabeler = {
  field?: (definition: CustomFieldDefinitionInput) => string;
  option?: (
    definition: CustomFieldDefinitionInput,
    option: { key: string; label: string },
  ) => string;
};

/** Eligible definitions → controls, in the operator's display order. */
export function toCustomFilterFields(
  definitions: readonly CustomFieldDefinitionInput[] | null | undefined,
  labeler: CustomFieldLabeler = {},
): CustomFilterField[] {
  const fields: CustomFilterField[] = [];
  const seen = new Set<string>();
  for (const definition of definitions ?? []) {
    if (definition.visibility && definition.visibility !== 'public') continue;
    if (!FIELD_KEY_PATTERN.test(definition.key)) continue;
    if (seen.has(definition.key)) continue;
    const label = labeler.field?.(definition) ?? definition.label;
    if (definition.type === 'boolean') {
      seen.add(definition.key);
      fields.push({ kind: 'flag', key: definition.key, label });
      continue;
    }
    if (
      definition.type !== 'single_select' &&
      definition.type !== 'multi_select'
    ) {
      continue;
    }
    const options = (definition.options ?? []).map((option) => ({
      value: option.key,
      label: labeler.option?.(definition, option) ?? option.label,
    }));
    if (options.length === 0) continue;
    seen.add(definition.key);
    fields.push({ kind: 'choice', key: definition.key, label, options });
  }
  return fields;
}

export function customFieldParam(key: string): CustomFieldParam {
  return `${CUSTOM_FIELD_PARAM_PREFIX}${key}`;
}

function isCustomFieldParam(param: string): param is CustomFieldParam {
  return param.startsWith(CUSTOM_FIELD_PARAM_PREFIX);
}

function valueTokens(value: UrlSearchValue): string[] {
  if (value === true) return ['true'];
  if (Array.isArray(value)) return value.flatMap((item) => item.split(','));
  const number = searchNumber(value);
  if (number !== undefined) return [String(number)];
  return searchString(value)?.split(',') ?? [];
}

function normalizeParamValue(value: UrlSearchValue): string | true | undefined {
  // The router decodes `cf.x=true` to the boolean; a checkbox field stores
  // it that way so the URL stays unquoted.
  if (value === true) return true;
  const tokens = [
    ...new Set(
      valueTokens(value)
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_CUSTOM_FIELD_VALUES);
  return tokens.length > 0 ? tokens.join(',') : undefined;
}

/**
 * Keep the well-formed `cf.*` parameters from raw URL input. Shape only:
 * definitions are not known here, so values are checked later by
 * `resolveCustomFieldFilters`.
 */
export function parseCustomFieldSearch(
  search: UrlSearchInput,
): CustomFieldSearch {
  return Object.fromEntries(
    Object.entries(search).flatMap(([param, raw]) => {
      if (!isCustomFieldParam(param)) return [];
      const key = param.slice(CUSTOM_FIELD_PARAM_PREFIX.length);
      if (!FIELD_KEY_PATTERN.test(key)) return [];
      const value = normalizeParamValue(raw);
      return value === undefined ? [] : [[param, value]];
    }),
  );
}

/** Only the `cf.*` entries of a route search, for loader dependencies. */
export function pickCustomFieldSearch(
  search: CustomFieldSearch,
): CustomFieldSearch {
  return Object.fromEntries(
    Object.entries(search).filter(
      ([param, value]) => isCustomFieldParam(param) && value !== undefined,
    ),
  );
}

/** The `cf.*` entries for a page request; `undefined` when there are none. */
export function customFieldRequestSearch(
  search: CustomFieldSearch,
): CustomFieldSearch | undefined {
  const picked = pickCustomFieldSearch(search);
  return hasCustomFieldSearch(picked) ? picked : undefined;
}

export function hasCustomFieldSearch(
  search: CustomFieldSearch | undefined,
): boolean {
  return Object.entries(search ?? {}).some(
    ([param, value]) => isCustomFieldParam(param) && value !== undefined,
  );
}

/**
 * URL parameters checked against the definitions → Board API clauses, in
 * definition order. Unknown keys, options the operator removed and values of
 * the wrong type are dropped; at most 10 clauses of 10 values are kept.
 */
export function resolveCustomFieldFilters(
  fields: readonly CustomFilterField[],
  search: CustomFieldSearch | undefined,
): CustomFieldFilter[] {
  const clauses: CustomFieldFilter[] = [];
  if (!search) return clauses;
  for (const field of fields) {
    if (clauses.length >= MAX_CUSTOM_FIELD_CLAUSES) break;
    const raw = search[customFieldParam(field.key)];
    if (raw === undefined) continue;
    if (field.kind === 'flag') {
      if (raw === true || raw === 'true') {
        clauses.push({ key: field.key, values: [true] });
      }
      continue;
    }
    const requested = new Set(valueTokens(raw));
    const values = field.options
      .map((option) => option.value)
      .filter((value) => requested.has(value))
      .slice(0, MAX_CUSTOM_FIELD_VALUES);
    if (values.length > 0) clauses.push({ key: field.key, values });
  }
  return clauses;
}

/** Clauses → URL parameters. The inverse of `resolveCustomFieldFilters`. */
export function customFieldFiltersToSearch(
  clauses: readonly CustomFieldFilter[],
): CustomFieldSearch {
  return Object.fromEntries(
    clauses.flatMap((clause): Array<[CustomFieldParam, string | true]> => {
      if (!FIELD_KEY_PATTERN.test(clause.key)) return [];
      const param = customFieldParam(clause.key);
      if (clause.values.includes(true)) return [[param, true]];
      const values = clause.values
        .flatMap((value) => searchString(value) ?? [])
        .slice(0, MAX_CUSTOM_FIELD_VALUES);
      return values.length > 0 ? [[param, values.join(',')]] : [];
    }),
  );
}

/**
 * Replace every `cf.*` parameter of `search` with the given clauses. Removed
 * fields are set to `undefined` so the router drops them from the URL.
 */
export function withCustomFieldFilters<T extends object>(
  search: T,
  clauses: readonly CustomFieldFilter[],
): T & CustomFieldSearch {
  const cleared: CustomFieldSearch = Object.fromEntries(
    Object.keys(search)
      .filter(isCustomFieldParam)
      .map((param) => [param, undefined]),
  );
  return { ...search, ...cleared, ...customFieldFiltersToSearch(clauses) };
}

/** Active selections, counted like the other sheet filters (one per option). */
export function countCustomFieldFilters(
  clauses: readonly CustomFieldFilter[],
): number {
  return clauses.reduce((total, clause) => total + clause.values.length, 0);
}

/** `undefined` for no clauses, so request bodies stay clean. */
export function customFieldFiltersOrUndefined(
  clauses: readonly CustomFieldFilter[],
): CustomFieldFilter[] | undefined {
  return clauses.length > 0 ? [...clauses] : undefined;
}
