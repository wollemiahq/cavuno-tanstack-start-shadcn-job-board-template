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
import { mergeAuthConversionSearch } from '@/lib/board-datalayer-events';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

type AccessSearch = { session_id?: string; returnTo?: string };

export const Route = createFileRoute('/account_/access')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  // Keys are omitted rather than set to `undefined` when absent, so plain
  // `<Link to="/account/access">` (the header avatar menu) needs no search
  // prop and renders without a trailing `?`. `returnTo` is kept raw here and
  // sanitized with `safeRedirectPath` at the point of navigation.
  validateSearch: (search: UrlSearchInput): AccessSearch => {
    const out: AccessSearch = {};
    const sessionId = searchString(search.session_id);
    const returnTo = searchString(search.returnTo);
    if (sessionId) out.session_id = sessionId;
    if (returnTo) out.returnTo = returnTo;
    return out;
  },
  loader: async ({ location }) => {
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
          search: mergeAuthConversionSearch(
            { returnTo: RETURN_PATH },
            location.searchStr ?? location.search,
          ),
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
