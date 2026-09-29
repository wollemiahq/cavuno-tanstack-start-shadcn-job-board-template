import {
  parseCustomFieldSearch,
  pickCustomFieldSearch,
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

export interface CompaniesSearch {
  /** 1-based page used by both browse and search pagination; page 1 drops from the URL. */
  page?: number;
  query?: string;
  /** Desktop detail-pane selection; the value is the canonical company slug. */
  selectedCompany?: string;
}

/** `/companies` also filters by public company profile fields (`cf.<key>`). */
export type CompaniesIndexSearch = CompaniesSearch & CustomFieldSearch;

export type CompaniesListingSearch = Omit<CompaniesSearch, 'selectedCompany'>;
export type CompaniesIndexListingSearch = CompaniesListingSearch &
  CustomFieldSearch;

function selectedCompanySearchValue(value: UrlSearchValue) {
  return searchString(value)?.trim() || undefined;
}

export function parseCompaniesSearch(search: UrlSearchInput): CompaniesSearch {
  return {
    query: searchQueryString(search.query),
    page: pageSearchValue(parsePageParam(search.page)),
    selectedCompany: selectedCompanySearchValue(search.selectedCompany),
  };
}

export function parseCompaniesIndexSearch(
  search: UrlSearchInput,
): CompaniesIndexSearch {
  return { ...parseCompaniesSearch(search), ...parseCustomFieldSearch(search) };
}

/** A pane selection changes history, but never the companies listing request. */
export function companiesListingLoaderDeps(
  search: CompaniesSearch,
): CompaniesListingSearch {
  return {
    query: search.query,
    page: search.page,
  };
}

export function companiesIndexLoaderDeps(
  search: CompaniesIndexSearch,
): CompaniesIndexListingSearch {
  return {
    ...companiesListingLoaderDeps(search),
    ...pickCustomFieldSearch(search),
  };
}

type CompanyMarketOption = { slug: string; name: string };

export function includeSelectedCompanyMarket(
  markets: CompanyMarketOption[],
  selectedMarket?: CompanyMarketOption,
) {
  if (
    !selectedMarket ||
    markets.some((market) => market.slug === selectedMarket.slug)
  ) {
    return markets;
  }

  return [selectedMarket, ...markets];
}
