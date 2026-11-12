import { useCallback } from 'react';

import { createFileRoute, notFound, useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';

import { m } from '../paraglide/messages';
import { useMembershipsViewer } from './-membership-offer';
import { MembershipsPageView } from './-memberships';
import { createMembershipsLoader } from './-memberships-loader';

import { searchString, type UrlSearchInput } from '@/lib/pagination';
import { safeRedirectPath } from '@/lib/safe-redirect-path';
import {
  getMembershipCheckoutState,
  startMembershipCheckout,
} from '@/server/membership-checkout';
import {
  getMembershipsPage,
  listMembershipCompanies,
} from '@/server/membership-pages';

/**
 * Stripe sends the buyer back here with `session_id`; `company` is the slug
 * the checkout was started for, so the return can poll the right seat (and,
 * before checkout, the company the buyer came to join for). `returnTo` is the
 * page that asked for a membership, such as a company's job form.
 */
type MembershipsSearch = {
  session_id?: string;
  company?: string;
  returnTo?: string;
};

export const Route = createFileRoute('/memberships')({
  staticData: { ownsMain: true },
  validateSearch: (search: UrlSearchInput): MembershipsSearch => ({
    session_id: searchString(search.session_id),
    company: searchString(search.company),
    returnTo: searchString(search.returnTo)
      ? safeRedirectPath(searchString(search.returnTo))
      : undefined,
  }),
  loader: createMembershipsLoader({ getMembershipsPage }, () => {
    throw notFound();
  }),
  head: ({ loaderData, match }) =>
    loaderData?.head
      ? loaderData.head
      : {
          meta: [
            {
              // A loader that threw notFound() still runs this head. Without
              // loader data there is no board name, and titling a 404 with the
              // page it failed to render advertises a page that does not exist.
              title:
                match.status === 'notFound'
                  ? m.notFound_heading()
                  : m.memberships_title(),
            },
          ],
        },
  component: MembershipsPage,
});

function MembershipsPage() {
  const { plans, rosters, seo } = Route.useLoaderData();
  const { session_id: sessionId, company, returnTo } = Route.useSearch();
  const router = useRouter();
  const startCheckout = useServerFn(startMembershipCheckout);
  const getCheckoutState = useServerFn(getMembershipCheckoutState);
  const invalidate = useCallback(() => router.invalidate(), [router]);

  const viewer = useMembershipsViewer();

  return (
    <MembershipsPageView
      plans={plans}
      rosters={rosters}
      seo={seo}
      viewer={viewer}
      loadMoreMembers={listMembershipCompanies}
      startCheckoutAction={startCheckout}
      getCheckoutStateAction={getCheckoutState}
      invalidate={invalidate}
      returning={
        sessionId && company ? { sessionId, companySlug: company } : null
      }
      preferredCompanySlug={company ?? null}
      continueTo={returnTo ?? null}
    />
  );
}
