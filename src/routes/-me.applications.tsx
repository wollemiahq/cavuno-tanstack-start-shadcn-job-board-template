/**
 * `/me/applications` — the signed-in candidate's applications, over
 * `board.me.applications.*` (list / withdraw). Status is the coarse,
 * Himalayas-grounded candidate view (applied → interviewing → … → archived).
 */
import { useState } from 'react';

import { formatDate } from '@cavuno/board/format';
import { Link } from '@tanstack/react-router';
import { Send } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import {
  applicationsRouteDependencies,
  type ApplicationsRouteDependencies,
} from './-me.applications-loader';

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
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionSuccess,
} from '@/lib/action-toast';
import type { Application } from '@cavuno/board';

const STATUS_LABEL = {
  applied: m.meApplications_statusApplied,
  interviewing: m.meApplications_statusInterviewing,
  negotiation: m.meApplications_statusNegotiation,
  hired: m.meApplications_statusHired,
  archived: m.meApplications_statusArchived,
} satisfies Record<Application['status'], () => string>;

export function ApplicationsPageView({
  applications,
  invalidate,
  dependencies = applicationsRouteDependencies,
}: {
  applications: { data: Application[] };
  invalidate: () => Promise<void>;
  dependencies?: ApplicationsRouteDependencies;
}) {
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
                to="/jobs"
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
                        date:
                          formatDate(getLocale(), application.appliedAt) ??
                          application.appliedAt.slice(0, 10),
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
                            await dependencies.withdrawApplication({
                              data: { id: application.id },
                            });
                          } catch {
                            void toastActionError();
                            setPendingId(null);
                            return;
                          }
                          void toastActionSuccess();
                          await reconcileCommittedAction(invalidate);
                          setPendingId(null);
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
