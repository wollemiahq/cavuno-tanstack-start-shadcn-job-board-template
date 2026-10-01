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
import {
  createFileRoute,
  defaultStringifySearch,
  isRedirect,
  redirect,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getAccessGrant, getPaywallOffers } from '../server/paywall';
import { getSeoBase } from '../server/queries';
import { AccessPage, accessReturnPath, safeReturnTo } from './-access-page';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
import {
  incomingAuthSearch,
  mergeAuthConversionSearch,
  type LocationAuthSearch,
} from '@/lib/board-datalayer-events';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

type AccessSearch = {
  session_id?: string;
  returnTo?: string;
  offerKey?: string;
};

/** Search values are read before nesting this page's path into an auth bounce. */
type AccessLocation = { search?: UrlSearchInput };

export type AccessLoaderDependencies = {
  getAccessGrant: () => ReturnType<typeof getAccessGrant>;
  getPaywallOffers: () => ReturnType<typeof getPaywallOffers>;
  getSeoBase: () => ReturnType<typeof getSeoBase>;
};

const accessLoaderDependencies: AccessLoaderDependencies = {
  getAccessGrant,
  getPaywallOffers,
  getSeoBase,
};

/**
 * The loader, dependency-explicit so its auth bounces are testable. Both
 * bounces carry the buyer's OWN destination nested inside this page's path:
 * sending bare `/account/access` truncates the listing they were unlocking,
 * so they come back from sign-in with no memory of it.
 */
export function createAccessLoader(
  dependencies: AccessLoaderDependencies = accessLoaderDependencies,
) {
  return async (context: { location: LocationAuthSearch & AccessLocation }) => {
    const { location } = context;
    const accessPath = accessReturnPath(
      safeReturnTo(searchString(location.search?.returnTo)),
    );
    const offerKey = searchString(location.search?.offerKey);
    const sessionId = searchString(location.search?.session_id);
    // Preserve the chosen opaque key through authentication only. Stripe's
    // return path intentionally omits it so a payment return cannot restart
    // checkout. Use the router codec to preserve numeric-looking strings too.
    const authValues: Pick<AccessSearch, 'offerKey' | 'session_id'> = {};
    if (offerKey) authValues.offerKey = offerKey;
    if (sessionId) authValues.session_id = sessionId;
    const authSearch = defaultStringifySearch(authValues);
    const returnTo = authSearch
      ? `${accessPath}${accessPath.includes('?') ? '&' : '?'}${authSearch.slice(1)}`
      : accessPath;
    try {
      const [grant, offers, seo] = await Promise.all([
        dependencies.getAccessGrant(),
        dependencies.getPaywallOffers(),
        // Was `seo: await getSeoBase()` in the return — a second serial wave
        // hidden in an object literal.
        dependencies.getSeoBase(),
      ]);
      return { grant, offers: offers.data, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: mergeAuthConversionSearch(
            { returnTo },
            incomingAuthSearch(location),
          ),
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo },
        });
      }
      throw error;
    }
  };
}

export const Route = createFileRoute('/account_/access')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  // Keys are omitted rather than set to `undefined` when absent, so plain
  // `<Link to="/account/access">` (the header avatar menu) needs no search
  // prop and renders without a trailing `?`. `returnTo` is kept raw here and
  // sanitized with `safeRedirectPath` at the point of navigation and, in the
  // loader, before it is nested into an auth bounce.
  validateSearch: (search: UrlSearchInput): AccessSearch => {
    const out: AccessSearch = {};
    const sessionId = searchString(search.session_id);
    const returnTo = searchString(search.returnTo);
    const offerKey = searchString(search.offerKey);
    if (sessionId) out.session_id = sessionId;
    if (returnTo) out.returnTo = returnTo;
    if (offerKey) out.offerKey = offerKey;
    return out;
  },
  loader: createAccessLoader(),
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
