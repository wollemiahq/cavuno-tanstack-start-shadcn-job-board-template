/**
 * Companies index — head + breadcrumb JSON-LD computed in getCompaniesIndexPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getCompaniesIndexPage } from '../server/companies-pages';

import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  companiesListingLoaderDeps,
  parseCompaniesSearch,
} from '@/lib/companies-search';
import { pageToOffset } from '@/lib/pagination';
import { ProgrammaticCompaniesView } from '@/routes/-programmatic-companies-view';

const COMPANIES_PAGE_SIZE = 24;

export const Route = createFileRoute('/companies/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseCompaniesSearch,
  loaderDeps: ({ search }) => companiesListingLoaderDeps(search),
  loader: async ({ deps }) =>
    getCompaniesIndexPage({
      data: {
        query: deps.query,
        offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
        limit: COMPANIES_PAGE_SIZE,
      },
    }),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: CompaniesPage,
});

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
