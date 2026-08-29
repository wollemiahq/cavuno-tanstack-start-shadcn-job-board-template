import {
  pageSearchValue,
  parsePageParam,
  searchString,
  type UrlSearchInput,
  type UrlSearchValue,
} from '@/lib/pagination';

/** Frozen `/talent` query stored on a talent list. Matches the v1 wire. */
export type TalentListFilters = {
  q?: string;
  skill?: string;
  jobSearchStatus?: 'actively_looking' | 'open_to_offers' | 'not_looking';
  languages?: string[];
  openToRelocate?: boolean;
  place?: string;
  sort?: 'relevance' | 'newest';
  seniority?: string;
  permitCountry?: string;
  interestedRole?: string;
};

export interface TalentSearch {
  /** 1-based page used by directory pagination; page 1 drops from the URL. */
  page?: number;
  /** Candidate name or headline query. */
  q?: string;
  /** Free-form skill-name filter. */
  skill?: string;
  jobSearchStatus?: 'actively_looking' | 'open_to_offers' | 'not_looking';
  languages?: string;
  openToRelocate?: 'true' | 'false';
  place?: string;
  sort?: 'relevance' | 'newest';
  seniority?: string;
  permitCountry?: string;
  interestedRole?: string;
  /** Desktop detail-pane selection; the canonical public profile handle. */
  selectedTalent?: string;
}

export type TalentListingSearch = Omit<TalentSearch, 'selectedTalent'>;

function stringSearchValue(value: UrlSearchValue) {
  return searchString(value)?.trim() || undefined;
}

const JOB_SEARCH_STATUSES = [
  'actively_looking',
  'open_to_offers',
  'not_looking',
] as const;

function jobSearchStatusValue(
  value: UrlSearchValue,
): TalentSearch['jobSearchStatus'] {
  const raw = stringSearchValue(value);
  return JOB_SEARCH_STATUSES.find((status) => status === raw);
}

function relocateValue(value: UrlSearchValue): TalentSearch['openToRelocate'] {
  const raw = stringSearchValue(value);
  if (raw === 'true' || raw === 'false') return raw;
  return undefined;
}

function sortValue(value: UrlSearchValue): TalentSearch['sort'] {
  const raw = stringSearchValue(value);
  if (raw === 'relevance' || raw === 'newest') return raw;
  return undefined;
}

export function parseTalentSearch(search: UrlSearchInput): TalentSearch {
  return {
    q: stringSearchValue(search.q),
    skill: stringSearchValue(search.skill),
    jobSearchStatus: jobSearchStatusValue(search.jobSearchStatus),
    languages: stringSearchValue(search.languages),
    openToRelocate: relocateValue(search.openToRelocate),
    place: stringSearchValue(search.place),
    sort: sortValue(search.sort),
    seniority: stringSearchValue(search.seniority),
    permitCountry: stringSearchValue(search.permitCountry),
    interestedRole: stringSearchValue(search.interestedRole),
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
    jobSearchStatus: search.jobSearchStatus,
    languages: search.languages,
    openToRelocate: search.openToRelocate,
    place: search.place,
    sort: search.sort,
    seniority: search.seniority,
    permitCountry: search.permitCountry,
    interestedRole: search.interestedRole,
    page: search.page,
  };
}

function languageNames(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const names = value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length > 0 ? names : undefined;
}

/** Stored list predicate. Drops pagination and the selected profile pane. */
export function talentSearchToListFilters(
  search: TalentSearch,
): TalentListFilters {
  const languages = languageNames(search.languages);
  return {
    ...(search.q ? { q: search.q } : {}),
    ...(search.skill ? { skill: search.skill } : {}),
    ...(search.jobSearchStatus
      ? { jobSearchStatus: search.jobSearchStatus }
      : {}),
    ...(languages ? { languages } : {}),
    ...(search.openToRelocate
      ? { openToRelocate: search.openToRelocate === 'true' }
      : {}),
    ...(search.place ? { place: search.place } : {}),
    ...(search.sort ? { sort: search.sort } : {}),
    ...(search.seniority ? { seniority: search.seniority } : {}),
    ...(search.permitCountry ? { permitCountry: search.permitCountry } : {}),
    ...(search.interestedRole ? { interestedRole: search.interestedRole } : {}),
  };
}

/** Hydrate a saved list back into `/talent` search params. */
export function listFiltersToTalentSearch(
  filters: TalentListFilters,
): TalentListingSearch {
  return {
    q: filters.q,
    skill: filters.skill,
    jobSearchStatus: filters.jobSearchStatus,
    languages: filters.languages?.join(','),
    openToRelocate:
      filters.openToRelocate === undefined
        ? undefined
        : filters.openToRelocate
          ? 'true'
          : 'false',
    place: filters.place,
    sort: filters.sort,
    seniority: filters.seniority,
    permitCountry: filters.permitCountry,
    interestedRole: filters.interestedRole,
  };
}
