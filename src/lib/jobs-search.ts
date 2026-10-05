import {
  EMPLOYMENT_TYPES,
  parseListingFilters,
  type ListingFilters,
} from '@cavuno/board/filters';

import { CUSTOM_EMPLOYMENT_TYPE_PREFIX } from '@/board/job-form';
import {
  parseCustomFieldSearch,
  type CustomFieldSearch,
} from '@/lib/custom-field-filters';
import {
  pageSearchValue,
  parsePageParam,
  searchQueryString,
  searchString,
  type UrlSearchInput,
  type UrlSearchValue,
} from '@/lib/pagination';

/**
 * The SDK's listing filters plus the board's custom employment type, which
 * the SDK vocabulary does not carry. The URL holds its key as
 * `customEmploymentType=<key>`, next to the built-in `employmentType`, and
 * it reaches the API as `customEmploymentType: [key]`.
 */
export type JobsFilters = ListingFilters & { customEmploymentType?: string };

/** Wire max length of a custom employment type key. */
const CUSTOM_EMPLOYMENT_TYPE_KEY_MAX = 100;

/** A custom employment type key from a URL; unknown keys simply match nothing. */
export function parseCustomEmploymentType(
  raw: UrlSearchValue,
): string | undefined {
  const key = searchString(raw)?.trim();
  return key && key.length <= CUSTOM_EMPLOYMENT_TYPE_KEY_MAX ? key : undefined;
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

export interface JobsSearch extends JobsFilters {
  /** 1-based page; page 1 drops from the URL. */
  page?: number;
  /** Desktop detail-pane selection; the value is the canonical job slug. */
  selectedJob?: string;
}

export function parseJobsSearch(search: UrlSearchInput): JobsSearch {
  const listingSearch = {
    ...search,
    q: searchQueryString(search.q) ?? searchQueryString(search.query),
  };
  const selectedJob = searchString(search.selectedJob)?.trim() || undefined;

  return {
    ...parseListingFilters(listingSearch),
    customEmploymentType: parseCustomEmploymentType(
      search.customEmploymentType,
    ),
    page: pageSearchValue(parsePageParam(search.page)),
    selectedJob,
  };
}

/** `/jobs` also filters by the board's job custom fields (`cf.<key>`). */
export type JobsIndexSearch = JobsSearch & CustomFieldSearch;

export function parseJobsIndexSearch(search: UrlSearchInput): JobsIndexSearch {
  return { ...parseJobsSearch(search), ...parseCustomFieldSearch(search) };
}

/** A pane selection changes history, but never the listing request. */
export function jobsListingLoaderDeps<T extends JobsSearch>(
  search: T,
): Omit<T, 'selectedJob'> {
  const { selectedJob: _selectedJob, ...listing } = search;
  return listing;
}
