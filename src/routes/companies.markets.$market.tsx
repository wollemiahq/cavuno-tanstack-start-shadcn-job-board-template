/**
 * Company market page — head + breadcrumb JSON-LD in getCompaniesMarketPage.
 * Market resolve + listing run in ONE server fn (no resolve-then-fetch waterfall).
 */
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { COMPANIES_PAGE_SIZE } from './-companies-index-loader';
import { createCompaniesMarketLoader } from './-companies-market-loader';

import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  companiesListingLoaderDeps,
  parseCompaniesSearch,
} from '@/lib/companies-search';
import { ProgrammaticCompaniesView } from '@/routes/-programmatic-companies-view';

export const Route = createFileRoute('/companies/markets/$market')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseCompaniesSearch,
  loaderDeps: ({ search }) => companiesListingLoaderDeps(search),
  loader: createCompaniesMarketLoader(),
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
