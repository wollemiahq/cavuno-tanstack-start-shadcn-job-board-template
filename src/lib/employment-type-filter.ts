/**
 * The job search's employment-type filter: a board's custom types next to
 * the built-ins. Only the filter controls load it; `jobs-search` rides every
 * page through route search validation, so it lives apart.
 */
import { EMPLOYMENT_TYPES } from '@cavuno/board/filters';

import {
  CUSTOM_EMPLOYMENT_TYPE_PREFIX,
  employmentTypeChoices,
  type EmploymentTypeChoice,
} from '@/board/employment-type-choices';
import {
  resolveJobFormConstraints,
  type JobFormSource,
} from '@/board/job-form';
import { enumLabel } from '@/lib/enum-labels';
import { parseCustomEmploymentType, type JobsFilters } from '@/lib/jobs-search';

/**
 * The job search's employment-type filter options: the board's offered
 * built-ins within the listing filter vocabulary plus its offered custom
 * types, in the board's order.
 */
export function employmentTypeFilterChoices(
  source?: JobFormSource | null,
): EmploymentTypeChoice[] {
  return employmentTypeChoices(
    resolveJobFormConstraints(source).employmentType,
    EMPLOYMENT_TYPES,
  ).choices;
}

/**
 * The Type filter's options: the board's offered types in its order, plus
 * the active filter when the board no longer offers it (a retired custom
 * type, a built-in it now disallows), labelled, so the filter stays visible
 * and clearable rather than showing a raw value. A built-in outside the
 * listing filter vocabulary is never an option.
 */
export function employmentTypeFilterOptions(
  source: JobFormSource | null | undefined,
  filters: { employmentType?: string; customEmploymentType?: string },
): { value: string; label: string }[] {
  const options = employmentTypeFilterChoices(source).map(
    ({ value, label }) => ({ value, label }),
  );
  const { customEmploymentType: key, employmentType } = filters;
  const active = key
    ? `${CUSTOM_EMPLOYMENT_TYPE_PREFIX}${key}`
    : EMPLOYMENT_TYPES.find((type) => type === employmentType);
  if (!active || options.some((option) => option.value === active)) {
    return options;
  }
  const label = key
    ? (resolveJobFormConstraints(source).employmentType.customTypes.find(
        (type) => type.key === key,
      )?.label ?? key)
    : (enumLabel(active) ?? active);
  return [...options, { value: active, label }];
}

/**
 * The employment-type filter as one picker value: `custom:<key>` for a
 * custom type, otherwise the built-in.
 */
export function employmentTypeFilterValue(
  filters: Pick<JobsFilters, 'employmentType' | 'customEmploymentType'>,
): string | undefined {
  return filters.customEmploymentType
    ? `${CUSTOM_EMPLOYMENT_TYPE_PREFIX}${filters.customEmploymentType}`
    : filters.employmentType;
}

/** A picker value back to the URL filters (clearing the other kind). */
export function employmentTypeFilterFromValue(
  value: string | undefined,
): Pick<JobsFilters, 'employmentType' | 'customEmploymentType'> {
  if (value?.startsWith(CUSTOM_EMPLOYMENT_TYPE_PREFIX)) {
    return {
      employmentType: undefined,
      customEmploymentType: parseCustomEmploymentType(
        value.slice(CUSTOM_EMPLOYMENT_TYPE_PREFIX.length),
      ),
    };
  }
  return {
    employmentType: EMPLOYMENT_TYPES.find((type) => type === value),
    customEmploymentType: undefined,
  };
}
