import { boardCopy } from '#/copy';

import { BOARD_PATHS, boardUrl, companyMarketPath } from '@cavuno/board/paths';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  getCompanyMarket,
  getCompanyMarkets,
  getSeoBase,
  listCompanies,
  searchCompanies,
} from '../server/queries';

import { JsonLd } from '@/components/json-ld';
import {
  companiesListingLoaderDeps,
  parseCompaniesSearch,
} from '@/lib/companies-search';
import { headTitle } from '@/lib/page-title';
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

    const [page, markets, seo] = await Promise.all([
      deps.query
        ? searchCompanies({
            data: {
              query: deps.query,
              marketSlug: params.market,
              offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
              limit: COMPANIES_PAGE_SIZE,
            },
          })
        : listCompanies({
            data: {
              marketSlug: params.market,
              offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
              limit: COMPANIES_PAGE_SIZE,
            },
          }),
      getCompanyMarkets({ data: { limit: 24 } }),
      getSeoBase(),
    ]);
    return { market, page, markets: markets.data, seo };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData.seo.boardName,
                m.marketPage_metaTitle({
                  market: loaderData.market.displayName,
                }),
              ),
            },
            {
              name: 'description',
              content: m.marketPage_metaDescription({
                market: loaderData.market.displayName,
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(
                loaderData.seo.origin,
                companyMarketPath(params.market),
              ),
            },
          ],
        }
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
  const { market, page, markets, seo } = Route.useLoaderData();
  const search = Route.useSearch();
  const params = Route.useParams();
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      {
        label: crumbs.companies,
        href: boardUrl(seo.origin, BOARD_PATHS.companies),
      },
      { label: market.displayName },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);

  return (
    <>
      <JsonLd data={jsonLd} />

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
