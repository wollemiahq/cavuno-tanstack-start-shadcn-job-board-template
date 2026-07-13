/**
 * The canonical jobs listing at `/jobs` — parity with the hosted board,
 * whose canonical jobs listing is `/jobs` (the home `/` is a landing).
 * A board migrating hosted → headless keeps its indexed `/jobs` URL.
 * Same listing surface as `/`, distinct canonical.
 */
import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";

import { boardCopy } from "#/copy";

import { pageSearchValue, pageToOffset } from "../lib/pagination";
import { jobsListingLoaderDeps, parseJobsSearch } from "../lib/jobs-search";
import { JobSearchPage } from "@/components/board/job-search-page";
import { JobAlertFloatingPrompt } from "../components/job-alert-floating-prompt";
import { JsonLd } from "../components/json-ld";
import { jobAlertDefaultsFromSearch } from "../lib/job-alert-defaults";
import { listingHead, listingJsonLd } from "@cavuno/board/seo";
import { getSeoBase, listJobs, searchJobs } from "../server/queries";
import { useLocationSuggestions } from "./-use-location-suggestions";
import { useSelectedJob } from "./-use-selected-job";
import { SelectedJobDetail } from "./-selected-job-detail";

const JOBS_PAGE_SIZE = 20;

export const Route = createFileRoute("/jobs/")({
  // Full-bleed: the page opens with the Lumen-style gray hero band
  // (CAV-497) and owns its own containers.
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: parseJobsSearch,
  loaderDeps: ({ search }) => jobsListingLoaderDeps(search),
  loader: async ({ deps }) => {
    const offset = pageToOffset(deps.page ?? 1, JOBS_PAGE_SIZE);
    const [page, seo] = await Promise.all([
      deps.q
        ? searchJobs({
            data: {
              query: deps.q,
              filters: {
                remoteOption: deps.remoteOption ? [deps.remoteOption] : undefined,
                employmentType: deps.employmentType ? [deps.employmentType] : undefined,
                seniority: deps.seniority?.length ? deps.seniority : undefined,
              },
              sort: deps.sort,
              offset,
              limit: JOBS_PAGE_SIZE,
            },
          })
        : listJobs({
            data: {
              remoteOption: deps.remoteOption ? [deps.remoteOption] : undefined,
              employmentType: deps.employmentType ? [deps.employmentType] : undefined,
              seniority: deps.seniority?.length ? deps.seniority : undefined,
              sort: deps.sort,
              offset,
              limit: JOBS_PAGE_SIZE,
              fields: "+description",
            },
          }),
      getSeoBase(),
    ]);
    return { page, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: "/jobs",
          heading: boardCopy(loaderData.seo.language, loaderData.seo.labels).jobSearch.headingJobs,
          count: loaderData.page.count,
        })
      : {},
  component: JobsPage,
});

const rootApi = getRouteApi("__root__");

function JobsPage() {
  const { page, seo } = Route.useLoaderData();
  const search = Route.useSearch();
  const { board, user } = rootApi.useLoaderData();
  const navigate = useNavigate({ from: "/jobs/" });
  const locationSuggestions = useLocationSuggestions(board.language);
  const selectedJob = useSelectedJob(
    page.data.some((job) => job.slug === search.selectedJob) ? search.selectedJob : undefined,
  );

  return (
    <>
      <JsonLd
        data={listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [{ name: boardCopy(board.language, board.labels).breadcrumbs.jobs }],
          jobs: page.data,
        })}
      />
      <JobSearchPage
        breadcrumb={{
          ariaLabel: boardCopy(board.language, board.labels).jobDetail.breadcrumbAriaLabel,
          items: [
            { name: boardCopy(board.language, board.labels).breadcrumbs.home, href: "/" },
            { name: boardCopy(board.language, board.labels).breadcrumbs.jobs },
          ],
        }}
        jobs={page.data}
        count={page.count}
        gatedCount={page.gatedCount}
        page={search.page ?? 1}
        pageSize={JOBS_PAGE_SIZE}
        filters={search}
        language={board.language}
        labels={board.labels}
        relatedSearches={"relatedSearches" in page ? page.relatedSearches : undefined}
        onFiltersChange={(next) =>
          navigate({
            to: "/jobs",
            search: () => ({
              ...next,
              page: undefined,
              selectedJob: undefined,
            }),
          })
        }
        onPageChange={(next) =>
          navigate({
            to: "/jobs",
            search: (prev) => ({
              ...prev,
              page: pageSearchValue(next),
              selectedJob: undefined,
            }),
          })
        }
        onSearchSubmit={(next, selectedLocation) => {
          if (selectedLocation) {
            void navigate({
              to: "/jobs/locations/$location",
              params: { location: selectedLocation.slug },
              search: () => ({
                ...next,
                page: undefined,
                selectedJob: undefined,
              }),
            });
            return;
          }
          void navigate({
            to: "/jobs",
            search: () => ({
              ...next,
              page: undefined,
              selectedJob: undefined,
            }),
          });
        }}
        locationSuggestions={locationSuggestions}
        selectedJob={search.selectedJob}
        onSelectedJobReplace={(jobSlug) =>
          navigate({
            search: (prev) => ({ ...prev, selectedJob: jobSlug }),
            replace: true,
            resetScroll: false,
          })
        }
        onSelectedJobPush={(jobSlug) =>
          navigate({
            search: (prev) => ({ ...prev, selectedJob: jobSlug }),
            resetScroll: false,
          })
        }
        detail={<SelectedJobDetail state={selectedJob} board={board} user={user} />}
      />
      {board.features.jobAlerts ? (
        <JobAlertFloatingPrompt
          language={board.language}
          labels={board.labels}
          defaults={jobAlertDefaultsFromSearch({
            keyword: search.q,
            source: "board_home",
          })}
        />
      ) : null}
    </>
  );
}
