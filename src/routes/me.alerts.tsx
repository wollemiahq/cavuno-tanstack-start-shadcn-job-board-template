/**
 * `/me/alerts` — authenticated job-alert management. Distinct from
 * the anonymous `/alerts/manage` (token-based) flow: this is the signed-in
 * candidate's own alerts over `board.me.alerts.*` (list / create / update /
 * remove). The loader also pulls the board places directory once so stored
 * `placeIds` render as names (the alert payload carries ids only).
 */
import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router';

import { AlertManager } from '../components/alert-manager';
import { m } from '../paraglide/messages';
import { getMyAlerts } from '../server/account';
import { getPaywallOffers } from '../server/paywall';
import { getSeoBase, searchPlaces } from '../server/queries';

import { CandidatePaywallLock } from '@/components/board/candidate-paywall-lock';
import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import {
  incomingAuthSearch,
  mergeAuthConversionSearch,
} from '@/lib/board-datalayer-events';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/me/alerts')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async ({ location }) => {
    try {
      const [alerts, places, seo] = await Promise.all([
        getMyAlerts(),
        // Name resolution only — an unavailable directory must not take the
        // alerts page down (ids render as-is instead).
        searchPlaces({ data: {} }).catch(() => ({ data: [] })),
        getSeoBase(),
      ]);
      return { locked: false as const, alerts, places, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'paywall-locked') {
        // Alert entitlement rides the viewer's job-seeker plan and is not on
        // the wire — the lock comes from the board's refusal, not a flag.
        const [offers, seo] = await Promise.all([
          getPaywallOffers().catch(() => ({ data: [] })),
          getSeoBase(),
        ]);
        return { locked: true as const, offers: offers.data, seo };
      }
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: mergeAuthConversionSearch(
            { returnTo: '/me/alerts' },
            incomingAuthSearch(location),
          ),
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
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.meAlerts_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const data = Route.useLoaderData();
  if (data.locked) {
    return (
      <CandidateShell>
        <CandidatePaywallLock
          title={m.candidatePaywallLock_alertsTitle()}
          offers={data.offers}
          returnTo="/me/alerts"
        />
      </CandidateShell>
    );
  }
  const { alerts, places } = data;
  // With no alerts the Empty composition IS the page — repeating the page
  // header above it reads the same thing twice.
  const hasAlerts = alerts.data.length > 0;

  return (
    <CandidateShell
      title={hasAlerts ? m.meAlerts_title() : undefined}
      description={hasAlerts ? m.meAlerts_subtitleText() : undefined}
    >
      <AlertManager alerts={alerts.data} places={places.data} />
    </CandidateShell>
  );
}
