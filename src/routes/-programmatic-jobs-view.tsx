import { getRouteApi, useNavigate } from '@tanstack/react-router';

import { JobAlertFloatingPrompt } from '../components/job-alert-floating-prompt';
import { jobAlertDefaultsFromSearch } from '../lib/job-alert-defaults';
import { pageSearchValue } from '../lib/pagination';
import { getLocale } from '../paraglide/runtime';
import { SelectedJobDetail } from './-selected-job-detail';
import { useSelectedJob } from './-use-selected-job';

import { toJobCardVM } from '@/board/job-view-model';
import { JobSearchPage } from '@/components/board/job-search-page';
import { useRootSession } from '@/components/root-session';
import type { JobsSearch } from '@/lib/jobs-search';
import type { UrlSearchInput } from '@/lib/pagination';
import type { PublicJobCard, RelatedSearch } from '@cavuno/board';

const rootApi = getRouteApi('__root__');

type LooseNavigate = (opts: {
  to?: string;
  params?: Record<string, string>;
  search?: (prev: UrlSearchInput) => UrlSearchInput;
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
  filters,
  location,
  onSaveJob,
}: {
  heading: string;
  count?: number;
  gatedCount?: number;
  jobs: PublicJobCard[];
  page: number;
  pageSize: number;
  relatedSearches?: RelatedSearch[];
  filters: JobsSearch;
  location?: { slug: string; label: string };
  /** Save-job mutation, threaded from the route (server fns stay route-owned). */
  onSaveJob: (jobId: string) => Promise<void>;
}) {
  const { board } = rootApi.useLoaderData();
  const { user } = useRootSession();
  const routeNavigate = useNavigate();
  // SAFETY: This component only uses stable search-object updates supported by
  // TanStack navigate; route-specific typing is erased at this shared view seam.
  const navigate = routeNavigate as LooseNavigate;
  const selectedSlug = jobs.some((job) => job.slug === filters.selectedJob)
    ? filters.selectedJob
    : undefined;
  const selectedCard = selectedSlug
    ? jobs.find((job) => job.slug === selectedSlug)
    : undefined;
  const selectedJob = useSelectedJob(
    selectedSlug,
    Boolean(user?.emailVerified),
    selectedCard?.company?.slug ?? null,
  );
  return (
    <>
      <JobSearchPage
        ads={board.ads}
        heading={heading}
        count={count}
        gatedCount={gatedCount}
        jobs={jobs.map((job) => toJobCardVM(job, getLocale(), board))}
        page={page}
        pageSize={pageSize}
        relatedSearches={relatedSearches}
        filters={filters}
        language={getLocale()}
        viewer={user ? { emailVerified: user.emailVerified } : null}
        onSaveJob={onSaveJob}
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
        detail={
          <SelectedJobDetail state={selectedJob} board={board} user={user} />
        }
      />

      {board.features.jobAlerts ? (
        <JobAlertFloatingPrompt
          language={board.language}
          defaults={jobAlertDefaultsFromSearch({
            keyword: filters.q,
            locationSlug: location?.slug,
            source: 'jobs_list',
          })}
        />
      ) : null}
    </>
  );
}
