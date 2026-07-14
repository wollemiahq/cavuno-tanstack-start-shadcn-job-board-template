/**
 * /alerts/confirm?token=… — the double-opt-in landing the confirmation email
 * links to (the board's canonical domain, which this starter serves). Confirms
 * server-side in the loader and renders the outcome by status.
 */
import { createFileRoute } from "@tanstack/react-router";

import { Page, PageContent } from "@/components/layout/page";
import { m } from "../paraglide/messages";
import { confirmJobAlert } from "../server/queries";

type ConfirmStatus = "confirmed" | "already_confirmed" | "expired" | "not_found";

const COPY: Record<ConfirmStatus, { heading: () => string; body: () => string }> = {
  confirmed: {
    heading: m.alertsConfirm_confirmedHeading,
    body: m.alertsConfirm_confirmedBody,
  },
  already_confirmed: {
    heading: m.alertsConfirm_alreadyConfirmedHeading,
    body: m.alertsConfirm_alreadyConfirmedBody,
  },
  expired: {
    heading: m.alertsConfirm_expiredHeading,
    body: m.alertsConfirm_expiredBody,
  },
  not_found: {
    heading: m.alertsConfirm_notFoundHeading,
    body: m.alertsConfirm_notFoundBody,
  },
};

export const Route = createFileRoute("/alerts/confirm")({
  staticData: { ownsMain: true },
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" && search.token ? search.token : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }): Promise<{ status: ConfirmStatus }> => {
    if (!deps.token) return { status: "not_found" };
    const result = await confirmJobAlert({ data: { token: deps.token } });
    return { status: result.status };
  },
  head: () => ({
    meta: [{ title: m.alertsConfirm_title() }, { name: "robots", content: "noindex" }],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { status } = Route.useLoaderData();
  const copy = COPY[status];
  return (
    <Page width="narrow">
      <PageContent>
        <div className="space-y-3 py-8 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{copy.heading()}</h1>
          <p className="text-muted-foreground">{copy.body()}</p>
        </div>
      </PageContent>
    </Page>
  );
}
