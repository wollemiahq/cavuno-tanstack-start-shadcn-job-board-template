/**
 * `/me/alerts` — authenticated job-alert management (ADR-0053). Distinct from
 * the anonymous `/alerts/manage` (token-based) flow: this is the signed-in
 * candidate's own alerts over `board.me.alerts.*` (list / create / update /
 * remove). The loader also pulls the board places directory once so stored
 * `placeIds` render as names (the alert payload carries ids only).
 */
import {
  createFileRoute,
  getRouteApi,
  isRedirect,
  redirect,
} from '@tanstack/react-router';

import { AlertManager } from '../components/alert-manager';
import { m } from '../paraglide/messages';
import { getMyAlerts } from '../server/account';
import { getSeoBase, searchPlaces } from '../server/queries';
import { useLocationSuggestions } from './-use-location-suggestions';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { CandidateShell } from '@/components/candidate-shell';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { pageTitle } from '@/lib/page-title';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/me/alerts')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: async () => {
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
  head: ({ loaderData }) => ({
    meta: [{ title: pageTitle(m.meAlerts_title(), loaderData?.seo.boardName) }],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { alerts, places } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const locationSuggestions = useLocationSuggestions(board.language);
  const placeNames = Object.fromEntries(
    places.data.map((place) => [place.id, place.name]),
  );

  return (
    <CandidateShell
      title={m.meAlerts_title()}
      description={m.meAlerts_subtitleText()}
    >
      <AlertManager
        alerts={alerts.data}
        placeNames={placeNames}
        locationSuggestions={locationSuggestions}
      />
    </CandidateShell>
  );
}
