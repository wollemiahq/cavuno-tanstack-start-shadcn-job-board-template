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
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router';
import { Send } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getApplications, withdrawApplication } from '../server/applications';
import { getBoardContext, getSeoBase } from '../server/queries';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { toastActionError, toastActionSuccess } from '@/lib/action-toast';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';
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
    // External-apply-only board (nativeApplications off): there is no
    // applications surface — the platform 422s the read. Treat it as
    // not-existing (404) rather than rendering an error state.
    const board = await getBoardContext();
    if (!board.features.nativeApplications) throw notFound();
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
        title: headTitle(loaderData?.seo.boardName, m.meApplications_title()),
      },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const applications = Route.useLoaderData();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  // With no applications the Empty composition IS the page — repeating the
  // page header above it reads the same thing twice.
  const hasApplications = applications.data.length > 0;

  return (
    <CandidateShell
      title={hasApplications ? m.meApplications_title() : undefined}
      description={hasApplications ? m.meApplications_subheading() : undefined}
    >
      <div className="space-y-6">
        {applications.data.length === 0 ? (
          <EmptyState
            icon={<Send aria-hidden="true" />}
            title={m.meApplications_title()}
            description={m.meApplications_emptyText()}
            action={
              <Link
                to="/jobs/$keyword"
                params={{ keyword: 'all' }}
                className={buttonVariants({ variant: 'outline' })}
              >
                {m.meApplications_browseJobsLink()}
              </Link>
            }
          />
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
                          try {
                            await withdrawApplication({
                              data: { id: application.id },
                            });
                            await router.invalidate();
                            void toastActionSuccess();
                          } catch {
                            void toastActionError();
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
