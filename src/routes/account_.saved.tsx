/**
 * Saved jobs — a standalone candidate account page, styled like the jobs
 * search surface: saved jobs list on the left, the selected job's full detail
 * on the right (fetched fresh by slug — the saved-list embed is a slimmer
 * projection than the `PublicJob` type promises and cannot feed the detail
 * pane; see the array defaults below for the card side of the same problem).
 *
 * Routing note (CAV-510): the file is `account_.saved` (trailing underscore) so
 * `/account/saved` is NOT nested under the `/account` leaf route. `/account`
 * renders the profile page and has no `<Outlet/>`, so nesting here meant
 * navigating to `/account/saved` rendered nothing — the page "did nothing".
 */
import { useState } from 'react';

import {
  createFileRoute,
  getRouteApi,
  isRedirect,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { Bookmark, BookmarkMinus } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getSavedJobs, unsaveJob } from '../server/account';
import { SelectedJobDetail } from './-selected-job-detail';
import { useSelectedJob } from './-use-selected-job';

import { toSavedJobCardVM } from '@/board/job-view-model';
import { JobSearchResult } from '@/components/board/job-search-result';
import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from '@/components/candidate-action-feedback';
import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { Page } from '@/components/layout/page';
import {
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from '@/components/search-results/search-results';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useSearchSelection } from '@/hooks/use-search-selection';
import { candidateLoaderError } from '@/lib/candidate-loader-error';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/account_/saved')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: (search: Record<string, unknown>): { selectedJob?: string } =>
    typeof search.selectedJob === 'string' && search.selectedJob
      ? { selectedJob: search.selectedJob }
      : {},
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async () => {
    try {
      return await getSavedJobs();
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo: '/account/saved' },
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: '/account/saved' },
        });
      }
      throw error;
    }
  },
  head: () => ({ meta: [{ title: m.accountShell_savedJobsNav() }] }),
  component: SavedJobsPage,
});

function SavedJobsPage() {
  const savedJobs = Route.useLoaderData();
  const search = Route.useSearch();
  const { board, user } = rootApi.useLoaderData();
  const navigate = useNavigate({ from: '/account/saved' });
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] =
    useState<CandidateActionFeedbackState>('idle');

  const rows = savedJobs.data.flatMap((saved) => {
    if (!saved.job) return [];
    const vm = toSavedJobCardVM(saved.job, board.language, board.labels);
    return vm ? [{ saved, vm }] : [];
  });

  const selectableSlugs = rows.flatMap(({ vm }) =>
    vm.jobSlug && vm.detailHref ? [vm.jobSlug] : [],
  );
  const selection = useSearchSelection({
    selectedId: search.selectedJob,
    resultIds: selectableSlugs,
    onReplace: (selectedJob) =>
      navigate({
        search: () => ({ selectedJob }),
        replace: true,
        resetScroll: false,
      }),
    onPush: (selectedJob) =>
      navigate({ search: () => ({ selectedJob }), resetScroll: false }),
  });
  const selectedJobState = useSelectedJob(
    selectableSlugs.includes(search.selectedJob ?? '')
      ? search.selectedJob
      : undefined,
    Boolean(user?.emailVerified),
  );

  const header = (
    <header className="space-y-1 px-4 md:px-0">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {m.accountShell_savedJobsNav()}
      </h1>
      <p className="text-muted-foreground text-sm">
        {m.accountHome_savedJobsHeading({ count: savedJobs.data.length })}
      </p>
      <CandidateActionFeedback state={feedback} />
    </header>
  );

  return (
    <Page width="wide" fill>
      <main
        data-layout="saved-jobs-page"
        className="md:flex md:h-full md:min-h-0 md:flex-col"
      >
        <div
          data-slot="saved-jobs-viewport"
          className="min-w-0 overflow-x-clip md:flex md:min-h-0 md:flex-1 md:overflow-hidden"
        >
          {rows.length === 0 ? (
            <SearchResultsLayout
              list={
                <div
                  data-slot="saved-jobs-empty"
                  className="space-y-4 px-4 pt-4 pb-4 md:col-span-2 md:px-0"
                >
                  {header}
                  <Empty className="border">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Bookmark aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>{m.accountShell_savedJobsNav()}</EmptyTitle>
                      <EmptyDescription>
                        {m.accountHome_savedJobsEmptyText()}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <a
                        href="/jobs"
                        className={buttonVariants({ variant: 'outline' })}
                      >
                        {m.meApplications_browseJobsLink()}
                      </a>
                    </EmptyContent>
                  </Empty>
                </div>
              }
              detail={null}
            />
          ) : (
            <SearchResultsLayout
              list={
                <SearchResultsList
                  label={m.accountShell_savedJobsNav()}
                  scrollRestorationId="saved-jobs-results"
                >
                  <div
                    data-slot="saved-jobs-content"
                    className="space-y-4 pt-4 pr-4 pb-4"
                  >
                    {header}
                    <div className="space-y-3">
                      {rows.map(({ saved, vm }) => (
                        <JobSearchResult
                          key={saved.id}
                          vm={vm}
                          selected={vm.jobSlug === selection.selectedId}
                          onActivate={
                            vm.jobSlug
                              ? (event) =>
                                  selection.onResultActivate(event, vm.jobSlug!)
                              : undefined
                          }
                          saveSlot={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={m.accountHome_unsaveLabel()}
                              title={m.accountHome_unsaveLabel()}
                              disabled={pendingId === saved.id}
                              onClick={async () => {
                                setPendingId(saved.id);
                                setFeedback('idle');
                                try {
                                  await unsaveJob({
                                    data: { jobId: saved.jobId },
                                  });
                                  await router.invalidate();
                                  setFeedback('success');
                                } catch {
                                  setFeedback('error');
                                } finally {
                                  setPendingId(null);
                                }
                              }}
                            >
                              <BookmarkMinus aria-hidden />
                            </Button>
                          }
                        />
                      ))}
                    </div>
                  </div>
                </SearchResultsList>
              }
              detail={
                <SearchResultDetail
                  ref={selection.detailRef}
                  label={m.jobSearch_selectedJobRegionLabel()}
                  scrollRestorationId="saved-selected-detail"
                >
                  <SelectedJobDetail
                    state={selectedJobState}
                    board={board}
                    user={user}
                  />
                </SearchResultDetail>
              }
            />
          )}
        </div>
      </main>
    </Page>
  );
}
