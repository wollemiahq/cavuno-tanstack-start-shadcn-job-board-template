/**
 * Companies index — head + breadcrumb JSON-LD computed in getCompaniesIndexPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { createFileRoute, notFound } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getCompaniesIndexPage } from '../server/companies-pages';

import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  companiesListingLoaderDeps,
  parseCompaniesSearch,
} from '@/lib/companies-search';
import {
  exceedsOffsetPaginationWindow,
  isOutOfBoundsOffsetPage,
  pageToOffset,
} from '@/lib/pagination';
import { ProgrammaticCompaniesView } from '@/routes/-programmatic-companies-view';

const COMPANIES_PAGE_SIZE = 24;

export const Route = createFileRoute('/companies/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseCompaniesSearch,
  loaderDeps: ({ search }) => companiesListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const page = deps.page ?? 1;
    const offset = pageToOffset(page, COMPANIES_PAGE_SIZE);
    if (exceedsOffsetPaginationWindow(offset, COMPANIES_PAGE_SIZE)) {
      throw notFound({ data: { kind: 'pagination' } });
    }
    const result = await getCompaniesIndexPage({
      data: {
        query: deps.query,
        offset,
        limit: COMPANIES_PAGE_SIZE,
      },
    });
    if (
      isOutOfBoundsOffsetPage({
        page,
        offset,
        count: result.page.count,
        resultCount: result.page.data.length,
      })
    ) {
      throw notFound({ data: { kind: 'pagination' } });
    }
    return result;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: CompaniesPage,
  notFoundComponent: CompaniesPaginationNotFound,
});

function CompaniesPaginationNotFound() {
  const search = Route.useSearch();

  return (
    <ProgrammaticCompaniesView
      heading={m.companiesIndex_metaTitle()}
      page={{ data: [], count: 0 }}
      pageSize={COMPANIES_PAGE_SIZE}
      markets={[]}
      search={search}
      searchUnavailable={false}
    />
  );
}

function CompaniesPage() {
  const { page, markets, searchUnavailable } = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <>
      <ProgrammaticCompaniesView
        heading={m.companiesIndex_metaTitle()}
        page={page}
        pageSize={COMPANIES_PAGE_SIZE}
        markets={markets}
        search={search}
        searchUnavailable={searchUnavailable}
      />
    </>
  );
}
