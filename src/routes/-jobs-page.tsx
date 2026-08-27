import { getRouteApi, useNavigate } from '@tanstack/react-router';

import { getLocale } from '../paraglide/runtime';
import { SelectedJobDetail } from './-selected-job-detail';
import { useSelectedJob } from './-use-selected-job';

import { toJobCardVM } from '@/board/job-view-model';
import { JobSearchPage } from '@/components/board/job-search-page';
import { JobAlertFloatingPrompt } from '@/components/job-alert-floating-prompt';
import { useRootSession } from '@/components/root-session';
import { jobAlertDefaultsFromSearch } from '@/lib/job-alert-defaults';
import { pageSearchValue } from '@/lib/pagination';
import { saveJob } from '@/server/account';

const JOBS_PAGE_SIZE = 20;
const routeApi = getRouteApi('/jobs/');
const rootApi = getRouteApi('__root__');

export function JobsPage() {
  const { page, relatedSearches } = routeApi.useLoaderData();
  const search = routeApi.useSearch();
  const { board } = rootApi.useLoaderData();
  const { user } = useRootSession();
  const navigate = useNavigate({ from: '/jobs/' });
  const selectedSlug = page.data.some((job) => job.slug === search.selectedJob)
    ? search.selectedJob
    : undefined;
  const selectedCard = selectedSlug
    ? page.data.find((job) => job.slug === selectedSlug)
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
        jobs={page.data.map((job) => toJobCardVM(job, getLocale(), board))}
        count={page.count}
        gatedCount={page.gatedCount}
        page={search.page ?? 1}
        pageSize={JOBS_PAGE_SIZE}
        filters={search}
        language={getLocale()}
        viewer={user ? { emailVerified: user.emailVerified } : null}
        onSaveJob={async (jobId) =>
          saveJob({ data: { jobId } }).then(() => undefined)
        }
        relatedSearches={relatedSearches}
        onFiltersChange={(next) =>
          navigate({
            to: '/jobs',
            search: () => ({
              ...next,
              page: undefined,
              selectedJob: undefined,
            }),
          })
        }
        onPageChange={(next) =>
          navigate({
            to: '/jobs',
            search: (prev) => ({
              ...prev,
              page: pageSearchValue(next),
              selectedJob: undefined,
            }),
          })
        }
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
        detail={
          <SelectedJobDetail state={selectedJob} board={board} user={user} />
        }
      />
      {board.features.jobAlerts ? (
        <JobAlertFloatingPrompt
          language={board.language}
          defaults={jobAlertDefaultsFromSearch({
            keyword: search.q,
            source: 'board_home',
          })}
        />
      ) : null}
    </>
  );
}
