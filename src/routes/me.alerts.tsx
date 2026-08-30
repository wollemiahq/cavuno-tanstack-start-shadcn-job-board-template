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
import { getSeoBase, searchPlaces } from '../server/queries';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import { mergeAuthConversionSearch } from '@/lib/board-datalayer-events';
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
      return { alerts, places, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: mergeAuthConversionSearch(
            { returnTo: '/me/alerts' },
            location.searchStr ?? location.search,
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
  const { alerts, places } = Route.useLoaderData();
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
