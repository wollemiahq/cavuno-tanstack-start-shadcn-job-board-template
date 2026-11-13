import { redirect } from '@tanstack/react-router';

import { followManagedRedirect, requestedPath } from './-catch-all-loader';
import { COMPANIES_PAGE_SIZE } from './-companies-index-loader';

import { companiesListingLoaderDeps } from '@/lib/companies-search';
import { pageToOffset } from '@/lib/pagination';
import { getCompaniesMarketPage } from '@/server/companies-pages';
import { resolveRedirect } from '@/server/queries';

export function createCompaniesMarketLoader(
  loadPage: typeof getCompaniesMarketPage = getCompaniesMarketPage,
  resolve: typeof resolveRedirect = resolveRedirect,
) {
  return async ({
    params,
    deps,
    location,
  }: {
    params: { market: string };
    deps: ReturnType<typeof companiesListingLoaderDeps>;
    location: { publicHref: string };
  }) => {
    const result = await loadPage({
      data: {
        marketSlug: params.market,
        query: deps.query,
        offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
        limit: COMPANIES_PAGE_SIZE,
      },
    });
    if (result.kind === 'not_found')
      return followManagedRedirect(resolve, requestedPath(location));
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
