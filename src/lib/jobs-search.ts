import { parseListingFilters, type ListingFilters } from "@cavuno/board/filters";

import { pageSearchValue, parsePageParam } from "@/lib/pagination";

export interface JobsSearch extends ListingFilters {
  /** 1-based page; page 1 drops from the URL. */
  page?: number;
  /** Desktop detail-pane selection; the value is the canonical job slug. */
  selectedJob?: string;
}

export function parseJobsSearch(search: Record<string, unknown>): JobsSearch {
  const selectedJob =
    typeof search.selectedJob === "string" && search.selectedJob.trim()
      ? search.selectedJob.trim()
      : undefined;

  return {
    ...parseListingFilters(search),
    page: pageSearchValue(parsePageParam(search.page)),
    selectedJob,
  };
}

/** A pane selection changes history, but never the listing request. */
export function jobsListingLoaderDeps(search: JobsSearch) {
  const listing = { ...search };
  delete listing.selectedJob;
  return listing;
}
