import {
  parseListingFilters,
  type ListingFilters,
} from '@cavuno/board/filters';

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
} from '@/lib/pagination';

export interface JobsSearch extends ListingFilters {
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
