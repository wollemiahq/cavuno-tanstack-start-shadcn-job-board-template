/**
 * Companies index — head + breadcrumb JSON-LD computed in getCompaniesIndexPage
 * so `@cavuno/board/seo` stays out of the universal client entry.
 */
import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  COMPANIES_PAGE_SIZE,
  createCompaniesIndexLoader,
} from './-companies-index-loader';

import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  companiesIndexLoaderDeps,
  parseCompaniesIndexSearch,
} from '@/lib/companies-search';
import { ProgrammaticCompaniesView } from '@/routes/-programmatic-companies-view';

export const Route = createFileRoute('/companies/')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseCompaniesIndexSearch,
  loaderDeps: ({ search }) => companiesIndexLoaderDeps(search),
  loader: createCompaniesIndexLoader(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: CompaniesPage,
});

function CompaniesPage() {
  const { page, markets, searchUnavailable, customFilterFields } =
    Route.useLoaderData();
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
        customFilters={{ fields: customFilterFields, search }}
      />
    </>
  );
}
