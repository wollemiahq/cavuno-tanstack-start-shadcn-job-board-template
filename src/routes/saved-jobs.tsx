/**
 * Saved jobs — same public URL as hosted boards (`/saved-jobs`).
 * File is a root route so it is not nested under `/account`.
 *
 * Styled like the jobs search surface: saved jobs list on the left, the
 * selected job's full detail on the right (fetched fresh by slug — the
 * saved-list embed is a slimmer projection than the `PublicJob` type
 * promises and cannot feed the detail pane; see the array defaults below
 * for the card side of the same problem).
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
import { Bookmark, BookmarkCheck } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSavedJobs, unsaveJob } from '../server/account';
import { getSeoBase } from '../server/queries';
import { SelectedJobDetail } from './-selected-job-detail';
import { useSelectedJob } from './-use-selected-job';

import { toSavedJobCardVM } from '@/board/job-view-model';
import { JobSearchResult } from '@/components/board/job-search-result';
import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { EmptyState } from '@/components/empty-state';
import { Page } from '@/components/layout/page';
import { useRootSession } from '@/components/root-session';
import {
  SearchResultDetail,
  SearchResultsLayout,
  SearchResultsList,
} from '@/components/search-results/search-results';
import { Text } from '@/components/text';
import { Button, buttonVariants } from '@/components/ui/button';
import { useSearchSelection } from '@/hooks/use-search-selection';
import { reconcileCommittedAction, toastActionError } from '@/lib/action-toast';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/saved-jobs')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: (search: UrlSearchInput): { selectedJob?: string } => {
    const selectedJob = searchString(search.selectedJob);
    return selectedJob ? { selectedJob } : {};
  },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async () => {
    try {
      const [saved, seo] = await Promise.all([getSavedJobs(), getSeoBase()]);
      return { ...saved, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo: '/saved-jobs' },
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: '/saved-jobs' },
        });
      }
      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.accountShell_savedJobsNav(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: SavedJobsPage,
});

function SavedJobsPage() {
  const savedJobs = Route.useLoaderData();
  const search = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const { user } = useRootSession();
  const navigate = useNavigate({ from: '/saved-jobs' });
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rows = savedJobs.data.flatMap((saved) => {
    if (!saved.job) return [];
    const vm = toSavedJobCardVM(saved.job, getLocale());
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
  const selectedSlug = selectableSlugs.includes(search.selectedJob ?? '')
    ? search.selectedJob
    : undefined;
  const selectedRow = selectedSlug
    ? rows.find(({ vm }) => vm.jobSlug === selectedSlug)
    : undefined;
  const selectedJobState = useSelectedJob(
    selectedSlug,
    Boolean(user?.emailVerified),
    selectedRow?.vm.companySlug ?? null,
  );

  const header = (
    <header className="space-y-1 px-4 md:px-0">
      <Text as="h1" variant="heading1">
        {m.accountShell_savedJobsNav()}
      </Text>
      <p className="text-muted-foreground text-sm">
        {savedJobs.data.length === 1
          ? m.accountSaved_countOneText()
          : m.accountSaved_countOtherText({ count: savedJobs.data.length })}
      </p>
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
                  {/* No header here — the empty state IS the page when there
                      is nothing saved; a header above it repeats it. */}
                  <EmptyState
                    icon={<Bookmark aria-hidden="true" />}
                    title={m.accountShell_savedJobsNav()}
                    description={m.accountHome_savedJobsEmptyText()}
                    action={
                      <a
                        href="/jobs"
                        className={buttonVariants({ variant: 'outline' })}
                      >
                        {m.meApplications_browseJobsLink()}
                      </a>
                    }
                  />
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
                    className="space-y-4 pe-4 pt-4 pb-4"
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
                                try {
                                  await unsaveJob({
                                    data: { jobId: saved.jobId },
                                  });
                                } catch {
                                  void toastActionError();
                                  setPendingId(null);
                                  return;
                                }
                                await reconcileCommittedAction(() =>
                                  router.invalidate(),
                                );
                                setPendingId(null);
                              }}
                            >
                              <BookmarkCheck aria-hidden />
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
                    saveSlot={
                      selectedJobState.job ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          title={m.accountHome_unsaveLabel()}
                          disabled={pendingId !== null}
                          onClick={async () => {
                            const saved = savedJobs.data.find(
                              (entry) =>
                                entry.job?.slug === selectedJobState.job?.slug,
                            );
                            if (!saved) return;
                            setPendingId(saved.id);
                            try {
                              await unsaveJob({ data: { jobId: saved.jobId } });
                            } catch {
                              void toastActionError();
                              setPendingId(null);
                              return;
                            }
                            await reconcileCommittedAction(() =>
                              router.invalidate(),
                            );
                            setPendingId(null);
                          }}
                        >
                          <BookmarkCheck aria-hidden data-icon="inline-start" />
                          {m.accountSaved_savedLabel()}
                        </Button>
                      ) : undefined
                    }
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
