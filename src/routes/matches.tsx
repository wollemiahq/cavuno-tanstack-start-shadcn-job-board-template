import { isNotFound as isApiNotFound } from '@cavuno/board';
import {
  createFileRoute,
  getRouteApi,
  isRedirect,
  notFound,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
/**
 * Job matches — same public URL as hosted boards (`/matches`).
 * File is a root route so it is not nested under `/account`.
 */
import { Briefcase, Upload } from 'lucide-react';

import { ResumeImportDialog } from '../components/resume-import-dialog';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getRecommendedJobs, saveJob } from '../server/account';
import { getFreshBoardContext, getSeoBase } from '../server/queries';
import { SelectedJobDetail } from './-selected-job-detail';
import { useSelectedJob } from './-use-selected-job';

import { toSavedJobCardVM } from '@/board/job-view-model';
import { JobSearchResult } from '@/components/board/job-search-result';
import { SaveJobButton } from '@/components/board/save-job-button';
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
import { buttonVariants } from '@/components/ui/button';
import { useSearchSelection } from '@/hooks/use-search-selection';
import {
  incomingAuthSearch,
  mergeAuthConversionSearch,
  type LocationAuthSearch,
} from '@/lib/board-datalayer-events';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';
import { recommendedJobsEmptyKind } from '@/lib/recommended-jobs';

const rootApi = getRouteApi('__root__');

export type MatchesLoaderDependencies = {
  getBoardContext: () => Promise<{
    features: { jobRecommendationsEnabled?: boolean };
  }>;
  getRecommendedJobs: () => ReturnType<typeof getRecommendedJobs>;
  getSeoBase: () => Promise<{ boardName: string }>;
};

const matchesLoaderDependencies: MatchesLoaderDependencies = {
  getBoardContext: getFreshBoardContext,
  getRecommendedJobs,
  getSeoBase,
};

export function createMatchesLoader(
  dependencies: MatchesLoaderDependencies = matchesLoaderDependencies,
) {
  return async (context?: {
    location?: LocationAuthSearch & { href: string };
  }) => {
    const returnTo = candidateReturnTo(context?.location?.href ?? '/matches');
    // The context read gives the route a fast, clean 404 for a disabled
    // surface. If that freshness probe is transiently unavailable, continue
    // to the recommendation API: it enforces the same gate authoritatively
    // and preserves the existing auth redirects.
    const board = await dependencies.getBoardContext().catch(() => null);
    if (board?.features.jobRecommendationsEnabled === false) throw notFound();
    try {
      const [recommended, seo] = await Promise.all([
        dependencies.getRecommendedJobs(),
        dependencies.getSeoBase(),
      ]);
      return { ...recommended, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      if (isApiNotFound(error)) throw notFound();
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: mergeAuthConversionSearch(
            { returnTo },
            incomingAuthSearch(context?.location),
          ),
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo },
        });
      }
      throw error;
    }
  };
}

export const Route = createFileRoute('/matches')({
  staticData: { fullBleed: true, ownsMain: true, fillsViewport: true },
  validateSearch: (search: UrlSearchInput): { selectedJob?: string } => {
    const selectedJob = searchString(search.selectedJob);
    return selectedJob ? { selectedJob } : {};
  },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: createMatchesLoader(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.accountShell_recommendedJobsNav(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: JobMatchesPage,
});

function JobMatchesPage() {
  const recommendedJobs = Route.useLoaderData();
  const search = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const { user } = useRootSession();
  const navigate = useNavigate({ from: '/matches' });
  const router = useRouter();

  const rows = recommendedJobs.data.flatMap((item) => {
    const vm = toSavedJobCardVM(item.job, getLocale(), board);
    return vm ? [{ item, vm }] : [];
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

  const firstName = user?.displayName?.trim().split(/\s+/)[0];
  const heading = firstName
    ? m.accountRecommended_heading({ name: firstName })
    : m.accountRecommended_headingFallback();
  const header = (
    <header className="space-y-1 px-4 md:px-0">
      <Text as="h1" variant="heading1">
        {heading}
      </Text>
      {rows.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {m.accountRecommended_count({
            count: rows.length,
            countLabel: String(rows.length),
          })}
        </p>
      ) : null}
    </header>
  );

  const emptyKind = recommendedJobsEmptyKind({
    skillCount: recommendedJobs.skillCount,
    parseStatus: recommendedJobs.parseStatus,
  });

  return (
    <Page width="wide" fill>
      <main
        data-layout="recommended-jobs-page"
        className="md:flex md:h-full md:min-h-0 md:flex-col"
      >
        <div
          data-slot="recommended-jobs-viewport"
          className="min-w-0 overflow-x-clip md:flex md:min-h-0 md:flex-1 md:overflow-hidden"
        >
          {rows.length === 0 ? (
            <SearchResultsLayout
              list={
                <div
                  data-slot="recommended-jobs-empty"
                  className="space-y-4 pt-4 pb-4 md:col-span-2"
                >
                  {header}
                  {emptyKind === 'needs-profile' ? (
                    <EmptyState
                      icon={<Upload aria-hidden="true" />}
                      title={m.accountRecommended_needsProfileTitle()}
                      description={m.resumeImport_description()}
                      action={
                        <ResumeImportDialog
                          resume={recommendedJobs.resume}
                          triggerLabel={m.resumeUpload_uploadLabel()}
                        />
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={<Briefcase aria-hidden="true" />}
                      title={m.accountRecommended_noneNowTitle()}
                      description={m.accountRecommended_noneNowText()}
                      action={
                        <a
                          href="/jobs"
                          className={buttonVariants({ variant: 'outline' })}
                        >
                          {m.meApplications_browseJobsLink()}
                        </a>
                      }
                    />
                  )}
                </div>
              }
              detail={null}
            />
          ) : (
            <SearchResultsLayout
              list={
                <SearchResultsList
                  label={m.accountShell_recommendedJobsNav()}
                  scrollRestorationId="recommended-jobs-results"
                >
                  <div
                    data-slot="recommended-jobs-content"
                    className="space-y-4 pe-4 pt-4 pb-4"
                  >
                    {header}
                    <div className="space-y-3">
                      {rows.map(({ item, vm }) => (
                        <JobSearchResult
                          key={item.job.id}
                          vm={vm}
                          selected={vm.jobSlug === selection.selectedId}
                          onActivate={
                            vm.jobSlug
                              ? (event) =>
                                  selection.onResultActivate(event, vm.jobSlug!)
                              : undefined
                          }
                          saveSlot={
                            <SaveJobButton
                              jobId={item.job.id}
                              viewer={
                                user
                                  ? { emailVerified: user.emailVerified }
                                  : null
                              }
                              returnTo="/matches"
                              presentation="icon"
                              labels={{
                                save: m.companyJobDetail_saveJobLabel(),
                                saving: m.companyJobDetail_savingLabel(),
                                saved:
                                  m.companyJobDetail_savedViewInAccountLabel(),
                                error: m.saveJobButton_errorText(),
                              }}
                              onSave={async (jobId) => {
                                await saveJob({ data: { jobId } });
                              }}
                              onSaved={() => router.invalidate()}
                            />
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
                  scrollRestorationId="recommended-selected-detail"
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
