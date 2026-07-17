/**
 * `/me/applications` — the signed-in candidate's applications (ADR-0054), over
 * `board.me.applications.*` (list / withdraw). Status is the coarse,
 * Himalayas-grounded candidate view (applied → interviewing → … → archived).
 */
import { useState } from 'react';

import {
  createFileRoute,
  isRedirect,
  Link,
  redirect,
  useRouter,
} from '@tanstack/react-router';
import { Send } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getApplications, withdrawApplication } from '../server/applications';
import { getSeoBase } from '../server/queries';

import {
  CandidateActionFeedback,
  type CandidateActionFeedbackState,
} from '@/components/candidate-action-feedback';
import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  EmptyMedia,
} from '@/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { pageTitle } from '@/lib/page-title';
import type { Application } from '@cavuno/board';

const STATUS_LABEL: Record<Application['status'], () => string> = {
  applied: m.meApplications_statusApplied,
  interviewing: m.meApplications_statusInterviewing,
  negotiation: m.meApplications_statusNegotiation,
  hired: m.meApplications_statusHired,
  archived: m.meApplications_statusArchived,
};

export const Route = createFileRoute('/me/applications')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async () => {
    try {
      const [applications, seo] = await Promise.all([
        getApplications({ data: undefined }),
        getSeoBase(),
      ]);
      return { ...applications, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo: '/me/applications' },
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: '/me/applications' },
        });
      }
      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: pageTitle(m.meApplications_title(), loaderData?.seo.boardName),
      },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const applications = Route.useLoaderData();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] =
    useState<CandidateActionFeedbackState>('idle');

  return (
    <CandidateShell
      title={m.meApplications_title()}
      description={m.meApplications_subheading()}
    >
      <div className="space-y-6">
        <CandidateActionFeedback state={feedback} />

        {applications.data.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Send aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{m.meApplications_title()}</EmptyTitle>
              <EmptyDescription>
                {m.meApplications_emptyText()}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                to="/jobs/$keyword"
                params={{ keyword: 'all' }}
                className={buttonVariants({ variant: 'outline' })}
              >
                {m.meApplications_browseJobsLink()}
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="space-y-3" data-test="applications-list">
            {applications.data.map((application) => (
              <li key={application.id}>
                <Item variant="outline">
                  <ItemContent>
                    <ItemTitle className="flex-wrap">
                      {application.job?.slug && application.job.companySlug ? (
                        <Link
                          to="/companies/$companySlug/jobs/$jobSlug"
                          params={{
                            companySlug: application.job.companySlug,
                            jobSlug: application.job.slug,
                          }}
                          className="font-medium underline"
                        >
                          {application.job.title}
                        </Link>
                      ) : (
                        <span className="font-medium">
                          {application.job?.title ??
                            m.meApplications_jobFallbackLabel()}
                        </span>
                      )}
                      <Badge
                        variant={
                          application.status === 'archived'
                            ? 'secondary'
                            : 'default'
                        }
                      >
                        {STATUS_LABEL[application.status]()}
                      </Badge>
                    </ItemTitle>
                    {application.job?.companyName ? (
                      <ItemDescription>
                        {application.job.companyName}
                      </ItemDescription>
                    ) : null}
                    <p className="text-muted-foreground text-xs">
                      {m.meApplications_appliedOn({
                        date: new Date(
                          application.appliedAt,
                        ).toLocaleDateString(),
                      })}
                    </p>
                  </ItemContent>
                  {application.status !== 'archived' ? (
                    <ItemActions className="self-start">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-test="application-withdraw"
                        disabled={pendingId === application.id}
                        onClick={async () => {
                          setPendingId(application.id);
                          setFeedback('idle');
                          try {
                            await withdrawApplication({
                              data: { id: application.id },
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
                        {m.meApplications_withdrawLabel()}
                      </Button>
                    </ItemActions>
                  ) : null}
                </Item>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CandidateShell>
  );
}
