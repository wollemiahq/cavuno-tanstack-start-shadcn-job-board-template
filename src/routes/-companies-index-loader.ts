import { companiesListingLoaderDeps } from '@/lib/companies-search';
import { pageToOffset } from '@/lib/pagination';
import { getCompaniesIndexPage } from '@/server/companies-pages';

export const COMPANIES_PAGE_SIZE = 24;

export function createCompaniesIndexLoader(
  loadPage: typeof getCompaniesIndexPage = getCompaniesIndexPage,
) {
  return async ({
    deps,
  }: {
    deps: ReturnType<typeof companiesListingLoaderDeps>;
  }) =>
    loadPage({
      data: {
        query: deps.query,
        offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
        limit: COMPANIES_PAGE_SIZE,
      },
    });
}
