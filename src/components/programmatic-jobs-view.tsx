import { getRouteApi, useNavigate } from "@tanstack/react-router";

import type { PublicJobCard, RelatedSearch } from "@cavuno/board";
import { listingJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";

import { JobSearchPage } from "@/components/board/job-search-page";
import type { LocationSuggestionState } from "@/components/location-combobox";
import type { JobsSearch } from "@/lib/jobs-search";
import { pageSearchValue } from "../lib/pagination";
import { JobAlertFloatingPrompt } from "./job-alert-floating-prompt";
import { JsonLd } from "./json-ld";
import { jobAlertDefaultsFromSearch } from "../lib/job-alert-defaults";
import { SelectedJobDetail } from "../routes/-selected-job-detail";
import { useSelectedJob } from "../routes/-use-selected-job";

const rootApi = getRouteApi("__root__");

export const PROGRAMMATIC_JOBS_PAGE_SIZE = 20;

type LooseNavigate = (opts: {
  to?: string;
  params?: Record<string, string>;
  search?: (prev: Record<string, unknown>) => Record<string, unknown>;
  replace?: boolean;
  resetScroll?: boolean;
}) => void;

export function ProgrammaticJobsView({
  heading,
  count,
  gatedCount,
  jobs,
  page,
  pageSize,
  relatedSearches,
  origin,
  filters,
  location,
  locationSuggestions,
}: {
  heading: string;
  count?: number;
  gatedCount?: number;
  jobs: PublicJobCard[];
  page: number;
  pageSize: number;
  relatedSearches?: RelatedSearch[];
  origin?: string;
  filters: JobsSearch;
  location?: { slug: string; label: string };
  locationSuggestions: LocationSuggestionState;
}) {
  const { board, user } = rootApi.useLoaderData();
  const copy = boardCopy(board.language, board.labels);
  const navigate = useNavigate() as unknown as LooseNavigate;
  const selectedJob = useSelectedJob(
    jobs.some((job) => job.slug === filters.selectedJob) ? filters.selectedJob : undefined,
  );
  const jsonLd = origin
    ? listingJsonLd({
        origin,
        breadcrumbs: [{ name: copy.breadcrumbs.jobs, path: "/" }, { name: heading }],
        jobs,
      })
    : null;

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}

      <JobSearchPage
        heading={heading}
        breadcrumb={
          jsonLd
            ? {
                ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
                items: [{ name: copy.breadcrumbs.jobs, href: "/" }, { name: heading }],
              }
            : undefined
        }
        count={count}
        gatedCount={gatedCount}
        jobs={jobs}
        page={page}
        pageSize={pageSize}
        relatedSearches={relatedSearches}
        filters={filters}
        language={board.language}
        labels={board.labels}
        location={location}
        locationSuggestions={locationSuggestions}
        onFiltersChange={(next) =>
          navigate({
            search: (prev) => ({
              ...prev,
              ...next,
              page: undefined,
              selectedJob: undefined,
            }),
          })
        }
        onSearchSubmit={(next, selectedLocation) => {
          if (selectedLocation) {
            navigate({
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
          navigate({
            to: "/jobs",
            search: () => ({
              ...next,
              page: undefined,
              selectedJob: undefined,
            }),
          });
        }}
        onPageChange={(next) =>
          navigate({
            search: (prev) => ({
              ...prev,
              page: pageSearchValue(next),
              selectedJob: undefined,
            }),
          })
        }
        selectedJob={filters.selectedJob}
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
            keyword: filters.q,
            locationSlug: location?.slug,
            source: "jobs_list",
          })}
        />
      ) : null}
    </>
  );
}
