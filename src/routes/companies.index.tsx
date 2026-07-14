import { boardCopy } from '#/copy';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  getCompanyMarkets,
  getSeoBase,
  listCompanies,
  searchCompanies,
  subscribeJobAlert,
} from '../server/queries';

import { AlertsBand } from '@/components/board/alerts-band';
import { JsonLd } from '@/components/json-ld';
import {
  companiesListingLoaderDeps,
  parseCompaniesSearch,
} from '@/lib/companies-search';
import { pageToOffset } from '@/lib/pagination';
import { ProgrammaticCompaniesView } from '@/routes/-programmatic-companies-view';

const COMPANIES_PAGE_SIZE = 24;

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/companies/')({
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: parseCompaniesSearch,
  loaderDeps: ({ search }) => companiesListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const [page, markets, seo] = await Promise.all([
      deps.query
        ? searchCompanies({
            data: {
              query: deps.query,
              cursor: deps.cursor,
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
            { title: m.companiesIndex_metaTitle() },
            {
              name: 'description',
              content: m.companiesIndex_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            { rel: 'canonical', href: `${loaderData.seo.origin}/companies` },
          ],
        }
      : { meta: [{ title: m.companiesIndex_metaTitle() }] },
  component: CompaniesPage,
});

function CompaniesPage() {
  const { page, markets, seo } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
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
        description={m.companiesIndex_metaDescription({
          boardName: seo.boardName,
        })}
        breadcrumb={{
          ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
          items: [{ name: crumbs.home, href: '/' }, { name: crumbs.companies }],
        }}
        page={page}
        pageSize={COMPANIES_PAGE_SIZE}
        markets={markets}
        search={search}
      />

      {board.features.jobAlerts ? (
        <AlertsBand
          language={board.language}
          labels={board.labels}
          source="companies_list"
          onSubscribe={async (input) => {
            const result = await subscribeJobAlert({ data: input });
            return { status: result.status };
          }}
        />
      ) : null}
    </>
  );
}
