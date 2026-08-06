/**
 * Candidate job-access paywall reference flow:
 *
 *   offers → connected-account embedded checkout → poll grant → ungated + manage
 *
 * This file owns the route: the loader fetches the entitlement + the offer
 * tiers, and `head` composes the title. The page component (with the plan
 * picker, embedded checkout, grant polling, and the sanitized return-to flow)
 * lives in the colocated `./-access-page` module so this route file exports only
 * `Route` and stays cleanly code-split.
 */
import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getAccessGrant, getPaywallOffers } from '../server/paywall';
import { getSeoBase } from '../server/queries';
import { AccessPage, RETURN_PATH } from './-access-page';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/account_/access')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  // Keys are omitted rather than set to `undefined` when absent, so plain
  // `<Link to="/account/access">` (the header avatar menu) needs no search
  // prop and renders without a trailing `?`. `returnTo` is kept raw here and
  // sanitized with `safeRedirectPath` at the point of navigation.
  validateSearch: (
    search: Record<string, unknown>,
  ): { session_id?: string; returnTo?: string } => {
    const out: { session_id?: string; returnTo?: string } = {};
    if (typeof search.session_id === 'string' && search.session_id) {
      out.session_id = search.session_id;
    }
    if (typeof search.returnTo === 'string' && search.returnTo) {
      out.returnTo = search.returnTo;
    }
    return out;
  },
  loader: async () => {
    try {
      const [grant, offers, seo] = await Promise.all([
        getAccessGrant(),
        getPaywallOffers(),
        // Was `seo: await getSeoBase()` in the return — a second serial wave
        // hidden in an object literal.
        getSeoBase(),
      ]);
      return { grant, offers: offers.data, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo: RETURN_PATH },
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: RETURN_PATH },
        });
      }
      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(loaderData?.seo.boardName, m.accountAccess_title()),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AccessPage,
});
