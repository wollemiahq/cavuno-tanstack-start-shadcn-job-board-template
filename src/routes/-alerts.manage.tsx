import { useState } from 'react';

import { m } from '../paraglide/messages';
import {
  alertManageDependencies,
  type AlertManageDependencies,
  type ManageData,
  type ManageSearch,
} from './-alerts.manage-loader';

import {
  describeJobAlert,
  type AlertFilterNames,
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
import type { JobAlertPreference } from '@cavuno/board';

/**
 * One alert in words: its name or what it matches, the rest of its
 * filters, and a badge only when it alone isn't sending (paused, or the
 * address isn't confirmed yet). A sending alert stays quiet.
 */
function PreferenceRow({
  preference,
  anchorJobPaths,
  filterNames,
  confirmed,
  unsubscribed,
  pending,
  onDelete,
}: {
  preference: JobAlertPreference;
  anchorJobPaths: AnchorJobPaths;
  filterNames: AlertFilterNames;
  confirmed: boolean;
  unsubscribed: boolean;
  pending: boolean;
  onDelete: () => void;
}) {
  const { headline, criteria } = describeJobAlert(preference, filterNames);
  const slug = preference.anchorJob?.slug;
  // Unsubscribed, every alert is off and the page says so once; nothing
  // sends to an address that isn't confirmed yet; past that, an alert that
  // isn't active is paused.
  const status = unsubscribed
    ? null
    : !confirmed
      ? m.alertsManage_awaitingBadge()
      : preference.isActive
        ? null
        : m.alertsManage_pausedBadge();
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {headline ?? (
            <AnchorJobTitle
              anchorJob={preference.anchorJob}
              path={slug ? anchorJobPaths[slug] : undefined}
            />
          )}
          {status ? <Badge variant="secondary">{status}</Badge> : null}
        </ItemTitle>
        {criteria.length ? (
          <ItemDescription>{criteria.join(' · ')}</ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onDelete}
        >
          {m.alertsManage_deleteLabel()}
        </Button>
      </ItemActions>
    </Item>
  );
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
  dependencies = alertManageDependencies,
}: {
  data: ManageData;
  search: ManageSearch;
  invalidate: () => Promise<void>;
  dependencies?: AlertManageDependencies;
}) {
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<
    'mutation' | 'reconciliation' | null
  >(null);
  const { link } = search;
  const state = 'state' in data ? data.state : null;
  const anchorJobPaths = 'state' in data ? data.anchorJobPaths : {};
  const filterNames =
    'state' in data ? data.filterNames : { categories: {}, places: {} };

  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setActionError(null);
    try {
      await action();
    } catch {
      setActionError('mutation');
      // Reloads the page's state; when the hour-long cookie has gone, the
      // page then says to use the link from a recent email.
      await invalidate().catch(() => undefined);
      setPending(false);
      return;
    }
    try {
      await invalidate();
    } catch {
      setActionError('reconciliation');
    }
    setPending(false);
  };

  if ('empty' in data) {
    return (
      <ManageNotice
        title={m.alertsManage_emptyTitle()}
        body={m.alertsManage_emptyBody()}
      />
    );
  }
  if (!state || !link) {
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
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                {m.alertsManage_title()}
              </h1>
              <p className="text-muted-foreground text-sm">
                {m.alertsManage_description({ email: state.email })}
              </p>
            </div>
            {/* The page's way out, not its main action; opening the
                email's Unsubscribe link changed nothing. */}
            {state.unsubscribed ? null : (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    await dependencies.unsubscribeJobAlert({ data: { link } });
                  })
                }
              >
                {m.alertsManage_unsubscribeAllLabel()}
              </Button>
            )}
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
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{m.alertsManage_unsubscribedText()}</span>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await dependencies.resubscribeJobAlert({
                        data: { link },
                      });
                    })
                  }
                >
                  {m.alertsManage_resubscribeLabel()}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <ul className="space-y-3">
            {state.preferences.map((preference) => (
              <li key={preference.id}>
                <PreferenceRow
                  preference={preference}
                  anchorJobPaths={anchorJobPaths}
                  filterNames={filterNames}
                  confirmed={state.confirmed}
                  unsubscribed={state.unsubscribed}
                  pending={pending}
                  onDelete={() =>
                    run(async () => {
                      await dependencies.deleteJobAlertPreference({
                        data: {
                          link,
                          preferenceId: preference.id,
                          token: preference.manageToken,
                        },
                      });
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      </PageContent>
    </Page>
  );
}
