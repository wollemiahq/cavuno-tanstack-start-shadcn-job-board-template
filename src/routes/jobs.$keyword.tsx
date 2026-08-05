/**
 * Programmatic category page — `/jobs/:keyword` (hosted parity:
 * `boards/[slug]/(main)/jobs/[keyword]/page.tsx`). The keyword is a *category*
 * slug: resolve it (404 if unknown; 308 to the canonical slug if the inbound
 * one isn't canonical), then the API seeds the search with the category's
 * English source name server-side — the consumer only passes the slug.
 *
 * Head meta is computed in getJobsCategoryPage so `@cavuno/board/seo` stays
 * out of the universal client entry.
 */
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { pageToOffset } from '../lib/pagination';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import { getJobsCategoryPage } from '../server/jobs-listing-pages';
import { resolveCategory } from '../server/queries';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/$keyword')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ params, deps }) => {
    const category = await resolveCategory({ data: { slug: params.keyword } });
    if (!category) throw notFound();
    if (category.redirectTo) {
      throw redirect({
        to: '/jobs/$keyword',
        params: { keyword: category.redirectTo },
        statusCode: 308,
      });
    }
    const page = await getJobsCategoryPage({
      data: {
        categorySlug: params.keyword,
        displayName: category.displayName,
        remoteOption: deps.remoteOption,
        employmentType: deps.employmentType,
        seniority: deps.seniority,
        sort: deps.sort,
        offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
        limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
      },
    });
    return { category, ...page };
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: CategoryPage,
  notFoundComponent: () => <JobsNotFound />,
});

function CategoryPage() {
  const { category, list, relatedSearches } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <ProgrammaticJobsView
      heading={m.categoryPage_jobsHeading({ category: category.displayName })}
      count={list.count}
      gatedCount={list.gatedCount}
      jobs={list.data}
      page={search.page ?? 1}
      pageSize={PROGRAMMATIC_JOBS_PAGE_SIZE}
      relatedSearches={relatedSearches}
      filters={search}
      onSaveJob={async (jobId) => {
        await saveJob({ data: { jobId } });
      }}
    />
  );
}
