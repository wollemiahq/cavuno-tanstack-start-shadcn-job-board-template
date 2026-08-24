import { notFound, redirect } from '@tanstack/react-router';

import { COMPANIES_PAGE_SIZE } from './-companies-index-loader';

import { companiesListingLoaderDeps } from '@/lib/companies-search';
import { pageToOffset } from '@/lib/pagination';
import { getCompaniesMarketPage } from '@/server/companies-pages';

export function createCompaniesMarketLoader(
  loadPage: typeof getCompaniesMarketPage = getCompaniesMarketPage,
) {
  return async ({
    params,
    deps,
  }: {
    params: { market: string };
    deps: ReturnType<typeof companiesListingLoaderDeps>;
  }) => {
    const result = await loadPage({
      data: {
        marketSlug: params.market,
        query: deps.query,
        offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
        limit: COMPANIES_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found') throw notFound();
    if (result.kind === 'redirect') {
      throw redirect({
        to: '/companies/markets/$market',
        params: { market: result.to },
        statusCode: 308,
      });
    }
    return result;
  };
}
