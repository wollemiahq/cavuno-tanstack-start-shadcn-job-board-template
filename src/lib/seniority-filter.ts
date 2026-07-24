import { SENIORITIES } from '@cavuno/board/filters';

/**
 * Seniority multi-select ⇄ URL-filter bridge.
 *
 * The `/jobs` seniority control is the owned shadcn multi-select composition,
 * whose value is a react-aria `Selection` (a `Set` of keys, or the sentinel
 * `"all"`). The listing URL carries `seniority` as a plain `string[]` (the
 * shape `@cavuno/board/filters` + the v1 API accept). These two pure helpers
 * are the ONLY translation between them, so the URL/search-param contract is
 * preserved exactly: an empty selection clears the filter (`undefined`, not
 * `[]`), and `"all"` expands to every canonical level.
 */
import type { Selection } from 'react-aria-components';

export type Seniority = (typeof SENIORITIES)[number];

/** MultiSelect `Selection` → the `seniority[]` filter (undefined when empty). */
export function seniorityFromSelection(
  keys: Selection,
): Seniority[] | undefined {
  const list = keys === 'all' ? [...SENIORITIES] : ([...keys] as Seniority[]);
  return list.length > 0 ? list : undefined;
}

/** The controlled `Selection` for the active `seniority` filter. */
export function selectionFromSeniority(
  seniority: Seniority[] | undefined,
): Selection {
  return new Set<Seniority>(seniority ?? []);
}
