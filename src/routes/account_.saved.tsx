/**
 * Saved jobs — a standalone candidate account page.
 *
 * Routing note (CAV-510): the file is `account_.saved` (trailing underscore) so
 * `/account/saved` is NOT nested under the `/account` leaf route. `/account`
 * renders the profile page and has no `<Outlet/>`, so nesting here meant
 * navigating to `/account/saved` rendered nothing — the page "did nothing".
 */
import { useState } from 'react';

import { fullJobToCard } from '@cavuno/board/format';
import {
  createFileRoute,
  getRouteApi,
  isRedirect,
  redirect,
  useRouter,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getSavedJobs, unsaveJob } from '../server/account';

import { toJobCardVM } from '@/board/job-view-model';
import { JobCard } from '@/components/board/job-card';
import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from '@/components/candidate-action-feedback';
import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { candidateLoaderError } from '@/lib/candidate-loader-error';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/account_/saved')({
  staticData: { ownsMain: true },
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
  head: () => ({ meta: [{ title: m.accountHome_title() }] }),
  component: SavedJobsPage,
});

function SavedJobsPage() {
  const savedJobs = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] =
    useState<CandidateActionFeedbackState>('idle');

  return (
    <CandidateShell>
      <div className="space-y-4">
        <header>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {m.accountShell_savedJobsNav()}
          </h1>
          <p className="text-muted-foreground text-sm">
            {m.accountHome_savedJobsHeading({ count: savedJobs.data.length })}
          </p>
        </header>
        <CandidateActionFeedback state={feedback} />
        {savedJobs.data.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>{m.accountShell_savedJobsNav()}</EmptyTitle>
              <EmptyDescription>
                {m.accountHome_savedJobsEmptyText()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          savedJobs.data.map((saved) => (
            <JobCard
              key={saved.id}
              vm={toJobCardVM(
                fullJobToCard(board.language, saved.job),
                board.language,
                board.labels,
              )}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingId === saved.id}
                  onClick={async () => {
                    setPendingId(saved.id);
                    setFeedback('idle');
                    try {
                      await unsaveJob({ data: { jobId: saved.jobId } });
                      await router.invalidate();
                      setFeedback('success');
                    } catch {
                      setFeedback('error');
                    } finally {
                      setPendingId(null);
                    }
                  }}
                >
                  {m.accountHome_unsaveLabel()}
                </Button>
              }
            />
          ))
        )}
      </div>
    </CandidateShell>
  );
}
