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
import { useState } from "react";

import { createFileRoute, useRouter } from "@tanstack/react-router";

import type { JobAlertManageState, JobAlertStoredFilters } from "@cavuno/board";

import { Page, PageContent } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { m } from "../paraglide/messages";

import {
  deleteJobAlertPreference,
  getJobAlertManageState,
  resubscribeJobAlert,
  unsubscribeJobAlert,
} from "../server/queries";

type LoaderData = { state: JobAlertManageState } | { error: true };

export const Route = createFileRoute("/alerts/manage")({
  staticData: { ownsMain: true },
  validateSearch: (search: Record<string, unknown>): { subscription?: string; token?: string } => ({
    subscription:
      typeof search.subscription === "string" && search.subscription
        ? search.subscription
        : undefined,
    token: typeof search.token === "string" && search.token ? search.token : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }): Promise<LoaderData> => {
    if (!deps.subscription || !deps.token) return { error: true };
    try {
      const state = await getJobAlertManageState({
        data: { subscription: deps.subscription, token: deps.token },
      });
      return { state };
    } catch {
      return { error: true };
    }
  },
  head: () => ({
    meta: [{ title: m.alertsManage_title() }, { name: "robots", content: "noindex" }],
  }),
  component: ManagePage,
});

function filtersSummary(filters: JobAlertStoredFilters): string {
  const parts = [
    ...(filters.jobFunctions ?? []),
    ...(filters.remoteOptions ?? []).map((option) => option.replaceAll("_", " ")),
  ];
  return parts.length ? parts.join(", ") : m.alertsManage_allJobsText();
}

function ManagePage() {
  const data = Route.useLoaderData();
  const { subscription, token } = Route.useSearch();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState(false);

  if ("error" in data) {
    return (
      <Page width="narrow">
        <PageContent>
          <div className="space-y-3 py-8 text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {m.alertsManage_invalidTitle()}
            </h1>
            <p className="text-muted-foreground">{m.alertsManage_invalidBody()}</p>
          </div>
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
            <p className="text-sm text-muted-foreground">{state.email}</p>
          </header>

          {actionError ? (
            <p role="alert" className="text-sm text-destructive">
              {m.alertsManage_actionErrorText()}
            </p>
          ) : null}

          {state.unsubscribed ? (
            <div className="space-y-2 rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground">{m.alertsManage_unsubscribedText()}</p>
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
            </div>
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
              <li
                key={preference.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant={preference.isActive ? "default" : "secondary"}>
                      {preference.isActive
                        ? m.alertsManage_activeBadge()
                        : m.alertsManage_pausedBadge()}
                    </Badge>
                    <span className="text-muted-foreground">
                      {preference.frequency === "daily"
                        ? m.alertManager_frequencyDaily()
                        : m.alertManager_frequencyWeekly()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{filtersSummary(preference.filters)}</p>
                </div>
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
              </li>
            ))}
          </ul>
        </div>
      </PageContent>
    </Page>
  );
}
