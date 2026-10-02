/**
 * /alerts/manage?subscription=&token=… — the self-service page the digest
 * email's manage/unsubscribe links point to (the board's canonical domain, which
 * this starter serves). The subscription-wide token gates the read + unsubscribe
 * /resubscribe; each preference carries its own token for delete.
 *
 * The email's unsubscribe link is the manage link plus `unsubscribe=1`: the
 * page unsubscribes on arrival, then drops the param. It runs from the client,
 * not the loader, so link scanners that prefetch the email's links (they don't
 * run scripts) can't unsubscribe anyone.
 *
 * In-place filter editing is intentionally omitted: stored filters use place
 * IDs while the subscribe/update body uses place slugs (not reversible), so
 * editing would drop the location scope. Re-subscribe via the form to change
 * filters. Unsubscribe / resubscribe / delete are the full self-service set here.
 */
import { useEffect, useRef, useState } from 'react';

import {
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
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
import { enumLabel } from '@/lib/enum-labels';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';
import type {
  JobAlertDeletePreferenceInput,
  JobAlertManageQuery,
  JobAlertManageState,
  JobAlertManageTokenInput,
  JobAlertStoredFilters,
} from '@cavuno/board';

type AlertManageSeo = { boardName: string };
// `empty`: the token is valid but no alerts remain (the last one was deleted).
type ManageData =
  | { state: JobAlertManageState }
  | { empty: true }
  | { error: true };
type LoaderData = ManageData & { seo: AlertManageSeo };
type ManageSearch = {
  subscription?: string;
  token?: string;
  unsubscribe?: true;
};

export type AlertManageDependencies = {
  deleteJobAlertPreference: (options: {
    data: JobAlertDeletePreferenceInput;
  }) => ReturnType<typeof deleteJobAlertPreference>;
  getJobAlertManageState: (options: {
    data: JobAlertManageQuery;
  }) => Promise<JobAlertManageState | null>;
  getSeoBase: () => Promise<AlertManageSeo>;
  resubscribeJobAlert: (options: {
    data: JobAlertManageTokenInput;
  }) => ReturnType<typeof resubscribeJobAlert>;
  unsubscribeJobAlert: (options: {
    data: JobAlertManageTokenInput;
  }) => ReturnType<typeof unsubscribeJobAlert>;
};

const alertManageDependencies: AlertManageDependencies = {
  deleteJobAlertPreference,
  getJobAlertManageState,
  getSeoBase,
  resubscribeJobAlert,
  unsubscribeJobAlert,
};

export const Route = createFileRoute('/alerts/manage')({
  staticData: { ownsMain: true },
  validateSearch: (search: UrlSearchInput): ManageSearch => ({
    subscription: searchString(search.subscription),
    token: searchString(search.token),
    unsubscribe:
      searchString(search.unsubscribe) === '1' || search.unsubscribe === 1
        ? true
        : undefined,
  }),
  loaderDeps: ({ search }) => ({
    subscription: search.subscription,
    token: search.token,
  }),
  loader: createAlertManageLoader(),
  head: ({ loaderData }) => alertManageHead(loaderData),
  component: ManagePage,
});

export function createAlertManageLoader(
  dependencies: AlertManageDependencies = alertManageDependencies,
) {
  return async ({
    deps,
  }: {
    deps: Pick<ManageSearch, 'subscription' | 'token'>;
  }): Promise<LoaderData> => {
    // Started before the branch so it overlaps the manage-state read.
    const seoPromise = dependencies.getSeoBase();
    if (!deps.subscription || !deps.token) {
      return { error: true, seo: await seoPromise };
    }
    try {
      const [state, seo] = await Promise.all([
        dependencies.getJobAlertManageState({
          data: { subscription: deps.subscription, token: deps.token },
        }),
        seoPromise,
      ]);
      return state ? { state, seo } : { empty: true, seo };
    } catch {
      return { error: true, seo: await seoPromise };
    }
  };
}

export function alertManageHead(loaderData: LoaderData | undefined) {
  return {
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.alertsManage_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  };
}

function filtersSummary(filters: JobAlertStoredFilters): string {
  const parts = [
    ...(filters.jobFunctions ?? []),
    // Wire enums resolve through the catalog — never string-munged into
    // pseudo-English ('on site') on a localized page.
    ...(filters.remoteOptions ?? []).map(
      (option) => enumLabel(option) ?? option.replaceAll('_', ' '),
    ),
  ];
  if (parts.length === 0) return m.alertsManage_allJobsText();
  try {
    return new Intl.ListFormat(getLocale(), {
      style: 'long',
      type: 'conjunction',
    }).format(parts);
  } catch {
    return parts.join(', ');
  }
}

function ManagePage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <ManagePageView
      data={data}
      search={Route.useSearch()}
      invalidate={async () => {
        await router.invalidate();
      }}
      clearUnsubscribeIntent={() => {
        void navigate({
          search: (prev) => ({ ...prev, unsubscribe: undefined }),
          replace: true,
          resetScroll: false,
        });
      }}
    />
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
                      {filtersSummary(preference.filters)}
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
