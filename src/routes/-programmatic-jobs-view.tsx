import { boardCopy } from '#/copy';

import { listingJsonLd } from '@cavuno/board/seo';
import { getRouteApi, useNavigate } from '@tanstack/react-router';

import { JobAlertFloatingPrompt } from '../components/job-alert-floating-prompt';
import { JsonLd } from '../components/json-ld';
import { jobAlertDefaultsFromSearch } from '../lib/job-alert-defaults';
import { pageSearchValue } from '../lib/pagination';
import { SelectedJobDetail } from './-selected-job-detail';
import { useSelectedJob } from './-use-selected-job';

import { toJobCardVM } from '@/board/job-view-model';
import { JobSearchPage } from '@/components/board/job-search-page';
import type { JobsSearch } from '@/lib/jobs-search';
import type { PublicJobCard, RelatedSearch } from '@cavuno/board';

const rootApi = getRouteApi('__root__');

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
  resolvableTaxonomy,
  origin,
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
  /** Card tag-pill resolvability map (see `JobSearchPage`). */
  resolvableTaxonomy?: Record<string, string>;
  origin?: string;
  filters: JobsSearch;
  location?: { slug: string; label: string };
  /** Save-job mutation, threaded from the route (server fns stay route-owned). */
  onSaveJob: (jobId: string) => Promise<void>;
}) {
  const { board, user } = rootApi.useLoaderData();
  const copy = boardCopy(board.language, board.labels);
  const navigate = useNavigate() as unknown as LooseNavigate;
  const selectedJob = useSelectedJob(
    jobs.some((job) => job.slug === filters.selectedJob)
      ? filters.selectedJob
      : undefined,
    Boolean(user?.emailVerified),
  );
  const jsonLd = origin
    ? listingJsonLd({
        origin,
        breadcrumbs: [
          { name: copy.breadcrumbs.home, path: '/' },
          { name: copy.breadcrumbs.jobs, path: '/jobs' },
          { name: heading },
        ],
        jobs,
      })
    : null;

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}

      <JobSearchPage
        heading={heading}
        breadcrumb={{
          ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
          items: [
            { name: copy.breadcrumbs.jobs, href: '/jobs' },
            { name: heading },
          ],
        }}
        count={count}
        gatedCount={gatedCount}
        jobs={jobs.map((job) =>
          toJobCardVM(job, board.language, board.labels, resolvableTaxonomy),
        )}
        page={page}
        pageSize={pageSize}
        relatedSearches={relatedSearches}
        filters={filters}
        language={board.language}
        labels={board.labels}
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
          labels={board.labels}
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
