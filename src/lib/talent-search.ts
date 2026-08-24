import {
  pageSearchValue,
  parsePageParam,
  searchString,
  type UrlSearchInput,
  type UrlSearchValue,
} from '@/lib/pagination';

export interface TalentSearch {
  /** 1-based page used by directory pagination; page 1 drops from the URL. */
  page?: number;
  /** Candidate name or headline query. */
  q?: string;
  /** Free-form skill-name filter. */
  skill?: string;
  /** Desktop detail-pane selection; the canonical public profile handle. */
  selectedTalent?: string;
}

export type TalentListingSearch = Omit<TalentSearch, 'selectedTalent'>;

function stringSearchValue(value: UrlSearchValue) {
  return searchString(value)?.trim() || undefined;
}

export function parseTalentSearch(search: UrlSearchInput): TalentSearch {
  return {
    q: stringSearchValue(search.q),
    skill: stringSearchValue(search.skill),
    page: pageSearchValue(parsePageParam(search.page)),
    selectedTalent: stringSearchValue(search.selectedTalent),
  };
}

/** A detail-pane selection changes history, but never the directory request. */
export function talentListingLoaderDeps(
  search: TalentSearch,
): TalentListingSearch {
  return {
    q: search.q,
    skill: search.skill,
    page: search.page,
  };
}
