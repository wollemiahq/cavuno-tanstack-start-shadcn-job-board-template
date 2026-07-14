/**
 * `/me/alerts` — authenticated job-alert management (ADR-0053). Distinct from
 * the anonymous `/alerts/manage` (token-based) flow: this is the signed-in
 * candidate's own alerts over `board.me.alerts.*` (list / create / update /
 * remove).
 */
import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router';

import { AlertManager } from '../components/alert-manager';
import { m } from '../paraglide/messages';
import { getMyAlerts } from '../server/account';
import { useCandidateShellContext } from './-candidate-shell-context';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import { candidateLoaderError } from '@/lib/candidate-loader-error';

export const Route = createFileRoute('/me/alerts')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async () => {
    try {
      return await getMyAlerts();
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo: '/me/alerts' },
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: '/me/alerts' },
        });
      }
      throw error;
    }
  },
  head: () => ({ meta: [{ title: m.meAlerts_title() }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const alerts = Route.useLoaderData();
  const candidateShell = useCandidateShellContext();

  return (
    <CandidateShell active="alerts" {...candidateShell}>
      <div className="space-y-6">
        <header>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {m.meAlerts_title()}
          </h1>
          <p className="text-muted-foreground text-sm">
            {m.meAlerts_subtitleText()}
          </p>
        </header>

        <AlertManager alerts={alerts.data} />
      </div>
    </CandidateShell>
  );
}
