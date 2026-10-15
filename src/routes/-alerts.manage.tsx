import { useEffect, useRef, useState } from 'react';

import { m } from '../paraglide/messages';
import {
  alertManageDependencies,
  type AlertManageDependencies,
  type ManageData,
  type ManageSearch,
} from './-alerts.manage-loader';

import {
  jobAlertMatch,
  searchKeywordsText,
  type AnchorJobPaths,
} from '@/board/job-alert-match';
import { AnchorJobTitle } from '@/components/anchor-job-title';
import { Page, PageContent } from '@/components/layout/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { enumLabel } from '@/lib/enum-labels';
import type { JobAlertPreference } from '@cavuno/board';

function PreferenceSummary({
  preference,
  anchorJobPaths,
}: {
  preference: JobAlertPreference;
  anchorJobPaths: AnchorJobPaths;
}) {
  const match = jobAlertMatch(preference);
  // Similar-job alerts name their anchor job; the rest list their filters.
  if (match.kind === 'similar_job') {
    const slug = match.anchorJob?.slug;
    return (
      <AnchorJobTitle
        anchorJob={match.anchorJob}
        path={slug ? anchorJobPaths[slug] : undefined}
      />
    );
  }
  return [
    searchKeywordsText(match) ?? m.alertsManage_allJobsText(),
    // Wire enums resolve through the catalog — never string-munged into
    // pseudo-English ('on site') on a localized page.
    (preference.filters.remoteOptions ?? [])
      .map((option) => enumLabel(option) ?? option.replaceAll('_', ' '))
      .join(', '),
  ]
    .filter(Boolean)
    .join(' · ');
}

function ManageNotice({ title, body }: { title: string; body: string }) {
  return (
    <Page width="narrow">
      <PageContent>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{body}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PageContent>
    </Page>
  );
}

export function ManagePageView({
  data,
  search,
  invalidate,
  clearUnsubscribeIntent,
  dependencies = alertManageDependencies,
}: {
  data: ManageData;
  search: ManageSearch;
  invalidate: () => Promise<void>;
  clearUnsubscribeIntent: () => void;
  dependencies?: AlertManageDependencies;
}) {
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<
    'mutation' | 'reconciliation' | null
  >(null);
  const { subscription, token } = search;
  const state = 'state' in data ? data.state : null;
  const anchorJobPaths = 'state' in data ? data.anchorJobPaths : {};

  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setActionError(null);
    try {
      await action();
    } catch {
      setPending(false);
      setActionError('mutation');
      return;
    }
    try {
      await invalidate();
    } catch {
      setActionError('reconciliation');
    }
    setPending(false);
  };

  // One-click unsubscribe from the email link. The ref keeps it to a single
  // request (StrictMode double-runs effects); once handled, the param goes so
  // a reload doesn't unsubscribe again after a resubscribe.
  const unsubscribeHandled = useRef(false);
  const wantsUnsubscribe = Boolean(
    search.unsubscribe && state && subscription && token,
  );
  useEffect(() => {
    if (!wantsUnsubscribe || unsubscribeHandled.current) return;
    unsubscribeHandled.current = true;
    if (state?.unsubscribed) {
      clearUnsubscribeIntent();
      return;
    }
    void run(async () => {
      await dependencies.unsubscribeJobAlert({
        data: { subscriptionId: subscription!, token: token! },
      });
    }).then(clearUnsubscribeIntent);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per arrival
  }, [wantsUnsubscribe]);

  if ('empty' in data) {
    return (
      <ManageNotice
        title={m.alertsManage_emptyTitle()}
        body={m.alertsManage_emptyBody()}
      />
    );
  }
  if (!state || !subscription || !token) {
    return (
      <ManageNotice
        title={m.alertsManage_invalidTitle()}
        body={m.alertsManage_invalidBody()}
      />
    );
  }

  return (
    <Page width="narrow">
      <PageContent>
        <div className="space-y-6 py-4">
          <header className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {m.alertsManage_title()}
            </h1>
            <p className="text-muted-foreground text-sm">{state.email}</p>
          </header>

          {actionError ? (
            <Alert
              variant={actionError === 'mutation' ? 'destructive' : 'default'}
            >
              <AlertDescription>
                {actionError === 'mutation'
                  ? m.alertsManage_actionErrorText()
                  : m.candidateAction_reconciliationError()}
              </AlertDescription>
            </Alert>
          ) : null}

          {state.unsubscribed ? (
            <Alert role="status">
              <AlertDescription className="space-y-2">
                <p>{m.alertsManage_unsubscribedText()}</p>
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await dependencies.resubscribeJobAlert({
                        data: { subscriptionId: subscription, token },
                      });
                    })
                  }
                >
                  {m.alertsManage_resubscribeLabel()}
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await dependencies.unsubscribeJobAlert({
                    data: { subscriptionId: subscription, token },
                  });
                })
              }
            >
              {m.alertsManage_unsubscribeAllLabel()}
            </Button>
          )}

          <ul className="space-y-3">
            {state.preferences.map((preference) => (
              <li key={preference.id}>
                <Item variant="outline">
                  <ItemContent>
                    <ItemTitle>
                      <Badge
                        variant={preference.isActive ? 'default' : 'secondary'}
                      >
                        {preference.isActive
                          ? m.alertsManage_activeBadge()
                          : m.alertsManage_pausedBadge()}
                      </Badge>
                      <span className="text-muted-foreground">
                        {m.alertManager_frequencyWeekly()}
                      </span>
                    </ItemTitle>
                    <ItemDescription>
                      <PreferenceSummary
                        preference={preference}
                        anchorJobPaths={anchorJobPaths}
                      />
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          await dependencies.deleteJobAlertPreference({
                            data: {
                              subscriptionId: subscription,
                              preferenceId: preference.id,
                              token: preference.manageToken,
                            },
                          });
                        })
                      }
                    >
                      {m.alertsManage_deleteLabel()}
                    </Button>
                  </ItemActions>
                </Item>
              </li>
            ))}
          </ul>
        </div>
      </PageContent>
    </Page>
  );
}
