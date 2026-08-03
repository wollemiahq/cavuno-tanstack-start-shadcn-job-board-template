/**
 * Company market page — head + breadcrumb JSON-LD in getCompaniesMarketPage.
 */
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getCompaniesMarketPage } from '../server/companies-pages';
import { getCompanyMarket } from '../server/queries';

import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  companiesListingLoaderDeps,
  parseCompaniesSearch,
} from '@/lib/companies-search';
import { pageToOffset } from '@/lib/pagination';
import { ProgrammaticCompaniesView } from '@/routes/-programmatic-companies-view';

const COMPANIES_PAGE_SIZE = 24;

export const Route = createFileRoute('/companies/markets/$market')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseCompaniesSearch,
  loaderDeps: ({ search }) => companiesListingLoaderDeps(search),
  loader: async ({ params, deps }) => {
    const market = await getCompanyMarket({ data: { market: params.market } });
    if (!market) throw notFound();
    if (market.redirectTo) {
      throw redirect({
        to: '/companies/markets/$market',
        params: { market: market.redirectTo },
        statusCode: 308,
      });
    }

    const page = await getCompaniesMarketPage({
      data: {
        marketSlug: params.market,
        displayName: market.displayName,
        query: deps.query,
        offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
        limit: COMPANIES_PAGE_SIZE,
      },
    });
    return { market, ...page };
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: MarketPage,
  notFoundComponent: MarketNotFound,
});

function MarketNotFound() {
  const search = Route.useSearch();

  return (
    <ProgrammaticCompaniesView
      heading={m.marketPage_notFoundText()}
      page={{ data: [], count: 0 }}
      pageSize={COMPANIES_PAGE_SIZE}
      markets={[]}
      search={search}
    />
  );
}

function MarketPage() {
  const { market, page, markets } = Route.useLoaderData();
  const search = Route.useSearch();
  const params = Route.useParams();

  return (
    <>
      <ProgrammaticCompaniesView
        heading={market.displayName}
        page={page}
        pageSize={COMPANIES_PAGE_SIZE}
        markets={markets}
        market={{ slug: params.market, name: market.displayName }}
        search={search}
      />
    </>
  );
}
