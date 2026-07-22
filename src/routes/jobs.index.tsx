import { boardCopy } from '#/copy';

import { listingHead, listingJsonLd } from '@cavuno/board/seo';
/**
 * The canonical jobs listing at `/jobs` — parity with the hosted board,
 * whose canonical jobs listing is `/jobs` (the home `/` is a landing).
 * A board migrating hosted → headless keeps its indexed `/jobs` URL.
 * Same listing surface as `/`, distinct canonical.
 */
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from '@tanstack/react-router';

import { JobAlertFloatingPrompt } from '../components/job-alert-floating-prompt';
import { JsonLd } from '../components/json-ld';
import { jobAlertDefaultsFromSearch } from '../lib/job-alert-defaults';
import { jobsListingLoaderDeps, parseJobsSearch } from '../lib/jobs-search';
import { pageSearchValue, pageToOffset } from '../lib/pagination';
import { saveJob } from '../server/account';
import {
  filterRelatedSearches,
  getSeoBase,
  listJobs,
  searchJobs,
} from '../server/queries';

import { toJobCardVM } from '@/board/job-view-model';
import { resolveCardTaxonomy } from '@/lib/resolve-card-taxonomy';
import { SelectedJobDetail } from './-selected-job-detail';
import { useSelectedJob } from './-use-selected-job';

import { JobSearchPage } from '@/components/board/job-search-page';

const JOBS_PAGE_SIZE = 20;

export const Route = createFileRoute('/jobs/')({
  // Full-bleed: the page opens with the Lumen-style gray hero band
  // (CAV-497) and owns its own containers.
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
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
                remoteOption: deps.remoteOption
                  ? [deps.remoteOption]
                  : undefined,
                employmentType: deps.employmentType
                  ? [deps.employmentType]
                  : undefined,
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
              employmentType: deps.employmentType
                ? [deps.employmentType]
                : undefined,
              seniority: deps.seniority?.length ? deps.seniority : undefined,
              sort: deps.sort,
              offset,
              limit: JOBS_PAGE_SIZE,
              fields: '+description',
            },
          }),
      getSeoBase(),
    ]);
    // Keep only related-search chips that resolve to a live taxonomy page —
    // the browse facets can name a category/skill the resolver rejects, whose
    // chip would 404 (see the taxonomy-chip guard in queries.ts).
    const rawRelated =
      'relatedSearches' in page ? page.relatedSearches : undefined;
    const relatedSearches = rawRelated?.length
      ? await filterRelatedSearches({ data: { related: rawRelated } })
      : rawRelated;
    // Resolve the page's card tag pills so a card never links to a 404.
    const resolvableTaxonomy = await resolveCardTaxonomy(page.data);
    return { page, seo, relatedSearches, resolvableTaxonomy };
  },
  head: ({ loaderData }) =>
    loaderData
      ? listingHead({
          ...loaderData.seo,
          path: '/jobs',
          heading: boardCopy(loaderData.seo.language, loaderData.seo.labels)
            .jobSearch.headingJobs,
          count: loaderData.page.count,
        })
      : {},
  component: JobsPage,
});

const rootApi = getRouteApi('__root__');

function JobsPage() {
  const { page, seo, relatedSearches, resolvableTaxonomy } =
    Route.useLoaderData();
  const search = Route.useSearch();
  const { board, user } = rootApi.useLoaderData();
  const navigate = useNavigate({ from: '/jobs/' });
  const selectedJob = useSelectedJob(
    page.data.some((job) => job.slug === search.selectedJob)
      ? search.selectedJob
      : undefined,
    Boolean(user?.emailVerified),
  );

  return (
    <>
      <JsonLd
        data={listingJsonLd({
          origin: seo.origin,
          breadcrumbs: [
            {
              name: boardCopy(board.language, board.labels).breadcrumbs.home,
              path: '/',
            },
            { name: boardCopy(board.language, board.labels).breadcrumbs.jobs },
          ],
          jobs: page.data,
        })}
      />
      <JobSearchPage
        jobs={page.data.map((job) =>
          toJobCardVM(job, board.language, board.labels, resolvableTaxonomy),
        )}
        count={page.count}
        gatedCount={page.gatedCount}
        page={search.page ?? 1}
        pageSize={JOBS_PAGE_SIZE}
        filters={search}
        language={board.language}
        labels={board.labels}
        viewer={user ? { emailVerified: user.emailVerified } : null}
        onSaveJob={async (jobId) => {
          await saveJob({ data: { jobId } });
        }}
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
          labels={board.labels}
          defaults={jobAlertDefaultsFromSearch({
            keyword: search.q,
            source: 'board_home',
          })}
        />
      ) : null}
    </>
  );
}
