/**
 * `/me/alerts` — authenticated job-alert management (ADR-0053). Distinct from
 * the anonymous `/alerts/manage` (token-based) flow: this is the signed-in
 * candidate's own alerts over `board.me.alerts.*` (list / create / update /
 * remove).
 */
import { Text } from "@/components/text"
import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";

import { CandidateShell } from "@/components/account-shell";
import { AlertManager } from "../components/alert-manager";
import { m } from "../paraglide/messages";
import { getMyAlerts } from "../server/account";

function isEmailUnverified(error: unknown) {
  return String(error).includes("EMAIL_UNVERIFIED");
}

export const Route = createFileRoute("/me/alerts")({
  loader: async () => {
    try {
      return await getMyAlerts();
    } catch (error) {
      if (isRedirect(error)) throw error;
      if (isEmailUnverified(error)) {
        throw redirect({ to: "/auth/verify-email-required" });
      }
      throw redirect({ to: "/auth/sign-in" });
    }
  },
  head: () => ({ meta: [{ title: m.meAlerts_title() }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const alerts = Route.useLoaderData();

  return (
    <CandidateShell active="alerts">
      <div className="space-y-6">
        <header>
          <Text as="h1" variant="heading3">{m.meAlerts_title()}</Text>
          <p className="text-tertiary text-sm">{m.meAlerts_subtitleText()}</p>
        </header>

        <AlertManager alerts={alerts.data} />
      </div>
    </CandidateShell>
  );
}
