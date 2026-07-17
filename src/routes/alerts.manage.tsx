/**
 * /alerts/manage?subscription=&token=… — the self-service page the digest
 * email's manage/unsubscribe links point to (the board's canonical domain, which
 * this starter serves). The subscription-wide token gates the read + unsubscribe
 * /resubscribe; each preference carries its own token for delete.
 *
 * In-place filter editing is intentionally omitted: stored filters use place
 * IDs while the subscribe/update body uses place slugs (not reversible), so
 * editing would drop the location scope. Re-subscribe via the form to change
 * filters. Unsubscribe / resubscribe / delete are the full self-service set here.
 */
import { useState } from 'react';

import { createFileRoute, useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  getSeoBase,
  deleteJobAlertPreference,
  getJobAlertManageState,
  resubscribeJobAlert,
  unsubscribeJobAlert,
} from '../server/queries';

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
import { headTitle } from '@/lib/page-title';
import type { JobAlertManageState, JobAlertStoredFilters } from '@cavuno/board';

type LoaderData = ({ state: JobAlertManageState } | { error: true }) & {
  seo: Awaited<ReturnType<typeof getSeoBase>>;
};

export const Route = createFileRoute('/alerts/manage')({
  staticData: { ownsMain: true },
  validateSearch: (
    search: Record<string, unknown>,
  ): { subscription?: string; token?: string } => ({
    subscription:
      typeof search.subscription === 'string' && search.subscription
        ? search.subscription
        : undefined,
    token:
      typeof search.token === 'string' && search.token
        ? search.token
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }): Promise<LoaderData> => {
    // Started before the branch so it overlaps the manage-state read.
    const seoPromise = getSeoBase();
    if (!deps.subscription || !deps.token) {
      return { error: true, seo: await seoPromise };
    }
    try {
      const [state, seo] = await Promise.all([
        getJobAlertManageState({
          data: { subscription: deps.subscription, token: deps.token },
        }),
        seoPromise,
      ]);
      return { state, seo };
    } catch {
      return { error: true, seo: await seoPromise };
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.alertsManage_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ManagePage,
});

function filtersSummary(filters: JobAlertStoredFilters): string {
  const parts = [
    ...(filters.jobFunctions ?? []),
    ...(filters.remoteOptions ?? []).map((option) =>
      option.replaceAll('_', ' '),
    ),
  ];
  return parts.length ? parts.join(', ') : m.alertsManage_allJobsText();
}

function ManagePage() {
  const data = Route.useLoaderData();
  const { subscription, token } = Route.useSearch();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState(false);

  if ('error' in data) {
    return (
      <Page width="narrow">
        <PageContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.alertsManage_invalidTitle()}</EmptyTitle>
              <EmptyDescription>
                {m.alertsManage_invalidBody()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PageContent>
      </Page>
    );
  }

  const { state } = data;
  const run = async (action: () => Promise<unknown>) => {
    setPending(true);
    setActionError(false);
    try {
      await action();
      await router.invalidate();
    } catch {
      setActionError(true);
    } finally {
      setPending(false);
    }
  };

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
            <Alert variant="destructive">
              <AlertDescription>
                {m.alertsManage_actionErrorText()}
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
                    run(() =>
                      resubscribeJobAlert({
                        data: { subscriptionId: subscription!, token: token! },
                      }),
                    )
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
                run(() =>
                  unsubscribeJobAlert({
                    data: { subscriptionId: subscription!, token: token! },
                  }),
                )
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
                      {filtersSummary(preference.filters)}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          deleteJobAlertPreference({
                            data: {
                              subscriptionId: subscription!,
                              preferenceId: preference.id,
                              token: preference.manageToken,
                            },
                          }),
                        )
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
