/**
 * Public company / candidate profile fields as "All filters" controls, for
 * the companies and talent directory page functions.
 */
import { getBoard } from '../lib/board';

import {
  customFieldFiltersOrUndefined,
  hasCustomFieldSearch,
  resolveCustomFieldFilters,
  toCustomFilterFields,
  type CustomFieldSearch,
  type CustomFilterField,
} from '@/lib/custom-field-filters';
import type { CustomFieldFilter, ProfileFieldEntity } from '@cavuno/board';

/**
 * The section is an enhancement of the listing: when the definitions cannot
 * be read, the page renders without it (and ignores `cf.*` parameters)
 * instead of failing, like the optional market chips beside it.
 */
async function readProfileFilterFields(
  entity: ProfileFieldEntity,
  headers: Record<string, string>,
): Promise<CustomFilterField[]> {
  try {
    const fields = await getBoard().profileFields.retrieve(entity, {
      headers,
    });
    return toCustomFilterFields(fields.definitions);
  } catch {
    return [];
  }
}

/**
 * Start the definitions read and resolve the URL's `cf.*` parameters into
 * API clauses. Only a URL that carries parameters waits for the definitions
 * before the listing request; otherwise both run in parallel.
 */
export async function profileCustomFilters(
  entity: ProfileFieldEntity,
  search: CustomFieldSearch | undefined,
  headers: Record<string, string>,
): Promise<{
  fields: Promise<CustomFilterField[]>;
  clauses: CustomFieldFilter[] | undefined;
}> {
  const fields = readProfileFilterFields(entity, headers);
  if (!hasCustomFieldSearch(search)) return { fields, clauses: undefined };
  return {
    fields,
    clauses: customFieldFiltersOrUndefined(
      resolveCustomFieldFilters(await fields, search),
    ),
  };
}
