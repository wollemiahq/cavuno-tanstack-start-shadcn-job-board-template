/**
 * Programmatic category page — `/jobs/:keyword` (hosted parity:
 * `boards/[slug]/(main)/jobs/[keyword]/page.tsx`). The keyword is a *category*
 * slug: resolve + list + head run in ONE server fn (404 if unknown; 308 to the
 * canonical slug if the inbound one isn't canonical). The API seeds the search
 * with the category's English source name server-side.
 *
 * Head meta is computed in getJobsCategoryPage so `@cavuno/board/seo` stays
 * out of the universal client entry.
 */
import { createFileRoute } from '@tanstack/react-router';

import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { m } from '../paraglide/messages';
import { saveJob } from '../server/account';
import { createJobsCategoryLoader } from './-jobs-taxonomy-loaders';

import { JobsNotFound } from '@/components/board/jobs-not-found';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PROGRAMMATIC_JOBS_PAGE_SIZE } from '@/routes/-programmatic-jobs-constants';
import { ProgrammaticJobsView } from '@/routes/-programmatic-jobs-view';

export const Route = createFileRoute('/jobs/$keyword')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: createJobsCategoryLoader(),
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
