import { boardCopy } from '#/copy';

import { BOARD_PATHS, boardUrl } from '@cavuno/board/paths';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
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

export const Route = createFileRoute('/companies/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseCompaniesSearch,
  loaderDeps: ({ search }) => companiesListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const [page, markets, seo] = await Promise.all([
      deps.query
        ? searchCompanies({
            data: {
              query: deps.query,
              offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
              limit: COMPANIES_PAGE_SIZE,
            },
          })
        : listCompanies({
            data: {
              offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
              limit: COMPANIES_PAGE_SIZE,
            },
          }),
      getCompanyMarkets({ data: { limit: 24 } }),
      getSeoBase(),
    ]);
    return { page, markets: markets.data, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(
                loaderData?.seo.boardName,
                m.companiesIndex_metaTitle(),
              ),
            },
            {
              name: 'description',
              content: m.companiesIndex_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(loaderData.seo.origin, BOARD_PATHS.companies),
            },
          ],
        }
      : {
          meta: [{ title: headTitle(undefined, m.companiesIndex_metaTitle()) }],
        },
  component: CompaniesPage,
});

function CompaniesPage() {
  const { page, markets, seo } = Route.useLoaderData();
  const search = Route.useSearch();
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.companies },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);

  return (
    <>
      <JsonLd data={jsonLd} />

      <ProgrammaticCompaniesView
        heading={m.companiesIndex_metaTitle()}
        page={page}
        pageSize={COMPANIES_PAGE_SIZE}
        markets={markets}
        search={search}
      />
    </>
  );
}
