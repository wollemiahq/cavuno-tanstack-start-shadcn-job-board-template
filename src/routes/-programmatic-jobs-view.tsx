import { getRouteApi, useNavigate } from '@tanstack/react-router';

import { JobAlertFloatingPrompt } from '../components/job-alert-floating-prompt';
import { jobAlertDefaultsFromSearch } from '../lib/job-alert-defaults';
import { pageSearchValue } from '../lib/pagination';
import { SelectedJobDetail } from './-selected-job-detail';
import { useSelectedJob } from './-use-selected-job';

import { toJobCardVM } from '@/board/job-view-model';
import { JobSearchPage } from '@/components/board/job-search-page';
import type { JobsSearch } from '@/lib/jobs-search';
import type { PublicJobCard, RelatedSearch } from '@cavuno/board';

const rootApi = getRouteApi('__root__');

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
  const { board, user } = rootApi.useLoaderData();
  const navigate = useNavigate() as unknown as LooseNavigate;
  const selectedJob = useSelectedJob(
    jobs.some((job) => job.slug === filters.selectedJob)
      ? filters.selectedJob
      : undefined,
    Boolean(user?.emailVerified),
  );
  return (
    <>
      <JobSearchPage
        heading={heading}
        count={count}
        gatedCount={gatedCount}
        jobs={jobs.map((job) => toJobCardVM(job, board.language))}
        page={page}
        pageSize={pageSize}
        relatedSearches={relatedSearches}
        filters={filters}
        language={board.language}
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
