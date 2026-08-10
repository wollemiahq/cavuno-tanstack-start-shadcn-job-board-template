/**
 * Company market page — head + breadcrumb JSON-LD in getCompaniesMarketPage.
 * Market resolve + listing run in ONE server fn (no resolve-then-fetch waterfall).
 */
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getCompaniesMarketPage } from '../server/companies-pages';

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
    // ONE server fn: market resolve joins the listing + markets rail + SEO
    // batch so we do not pay a serial resolve hop before the real page read.
    const result = await getCompaniesMarketPage({
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
  const { market, page, markets, searchUnavailable } = Route.useLoaderData();
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
        searchUnavailable={searchUnavailable}
      />
    </>
  );
}
