import {
  parseListingFilters,
  type ListingFilters,
} from '@cavuno/board/filters';

import { parseSearchRadiusWithin } from '@/board/search-radius';
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

/**
 * Location listings also take `within`: a search distance in the place's
 * unit. A value that is not one of the presets is dropped (exact place).
 */
export type LocationJobsSearch = JobsSearch & { within?: number };

export function parseLocationJobsSearch(
  search: UrlSearchInput,
): LocationJobsSearch {
  return {
    ...parseJobsSearch(search),
    within: parseSearchRadiusWithin(search.within),
  };
}

/** A pane selection changes history, but never the listing request. */
export function jobsListingLoaderDeps<T extends JobsSearch>(
  search: T,
): Omit<T, 'selectedJob'> {
  const { selectedJob: _selectedJob, ...listing } = search;
  return listing;
}
