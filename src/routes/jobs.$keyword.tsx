/**
 * Programmatic category page — `/jobs/:keyword` (hosted parity:
 * `boards/[slug]/(main)/jobs/[keyword]/page.tsx`). The keyword is a *category*
 * slug: resolve it (404 if unknown; 308 to the canonical slug if the inbound
 * one isn't canonical), then the API seeds the search with the category's
 * English source name server-side — the consumer only passes the slug.
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { parseListingFilters } from "@cavuno/board/filters";
import { jobsCategoryPath } from "@cavuno/board/paths";

import { JobsNotFound } from "@/components/board/jobs-not-found";
import { ProgrammaticJobsView, PROGRAMMATIC_JOBS_PAGE_SIZE } from "../components/programmatic-jobs-view";
import { pageSearchValue, pageToOffset, parsePageParam } from "../lib/pagination";
import { listingHead } from "@cavuno/board/seo";
import { m } from "../paraglide/messages";
import { getSeoBase, listJobs, resolveCategory } from "../server/queries";
import { useLocationSuggestions } from "./-use-location-suggestions";

export const Route = createFileRoute("/jobs/$keyword")({
  staticData: { fullBleed: true },
  validateSearch: (
    search: Record<string, unknown>,
  ): ReturnType<typeof parseListingFilters> & { page?: number } => ({
    ...parseListingFilters(search),
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const category = await resolveCategory({ data: { slug: params.keyword } });
    if (!category) throw notFound();
    if (category.redirectTo) {
      throw redirect({
        to: "/jobs/$keyword",
        params: { keyword: category.redirectTo },
      });
    }
    const [list, seo] = await Promise.all([
      listJobs({
        data: {
          category: params.keyword,
          remoteOption: deps.remoteOption ? [deps.remoteOption] : undefined,
          employmentType: deps.employmentType ? [deps.employmentType] : undefined,
          seniority: deps.seniority?.length ? deps.seniority : undefined,
          sort: deps.sort,
          offset: pageToOffset(deps.page ?? 1, PROGRAMMATIC_JOBS_PAGE_SIZE),
          limit: PROGRAMMATIC_JOBS_PAGE_SIZE,
        },
      }),
      getSeoBase(),
    ]);
    return { category, list, seo };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: jobsCategoryPath(params.keyword),
          heading: m.categoryPage_jobsHeading({
            category: loaderData.category.displayName,
          }),
          count: loaderData.list.count,
        })
      : {},
  component: CategoryPage,
  notFoundComponent: () => <JobsNotFound message={m.categoryPage_notFoundText()} />,
});

function CategoryPage() {
  const { category, list, seo } = Route.useLoaderData();
  const search = Route.useSearch();
  const locationSuggestions = useLocationSuggestions(seo.language);
  return (
    <ProgrammaticJobsView
      heading={m.categoryPage_jobsHeading({ category: category.displayName })}
      count={list.count}
      jobs={list.data}
      page={search.page ?? 1}
      pageSize={PROGRAMMATIC_JOBS_PAGE_SIZE}
      relatedSearches={list.relatedSearches}
      origin={seo.origin}
      filters={search}
      locationSuggestions={locationSuggestions}
    />
  );
}
