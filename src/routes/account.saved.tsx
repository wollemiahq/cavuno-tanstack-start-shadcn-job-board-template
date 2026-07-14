/**
 * Saved jobs — its own tab in the candidate sidebar shell (moved out of
 * the profile page in the Paper layout-B restructure).
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
import { getAccount, unsaveJob } from '../server/account';
import { useCandidateShellContext } from './-candidate-shell-context';

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

export const Route = createFileRoute('/account/saved')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async () => {
    try {
      return await getAccount();
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
  const { me, profile, savedJobs } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const candidateShell = useCandidateShellContext();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] =
    useState<CandidateActionFeedbackState>('idle');

  return (
    <CandidateShell
      active="saved"
      {...candidateShell}
      identity={{
        avatarUrl: profile.avatarUrl,
        title: profile.displayName ?? me.email,
        subtitle: me.email,
      }}
    >
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
