import { useCallback } from 'react';

import { createFileRoute, notFound, useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';

import { m } from '../paraglide/messages';
import { MembershipsPageView, type MembershipsViewer } from './-memberships';
import { createMembershipsLoader } from './-memberships-loader';

import { useRootSession } from '@/components/root-session';
import { searchString, type UrlSearchInput } from '@/lib/pagination';
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
 * the checkout was started for, so the return can poll the right seat.
 */
type MembershipsSearch = { session_id?: string; company?: string };

export const Route = createFileRoute('/memberships')({
  staticData: { ownsMain: true },
  validateSearch: (search: UrlSearchInput): MembershipsSearch => ({
    session_id: searchString(search.session_id),
    company: searchString(search.company),
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
  const { session_id: sessionId, company } = Route.useSearch();
  const { user, ready, employerCompanies } = useRootSession();
  const router = useRouter();
  const startCheckout = useServerFn(startMembershipCheckout);
  const getCheckoutState = useServerFn(getMembershipCheckoutState);
  const invalidate = useCallback(() => router.invalidate(), [router]);

  // A membership is bought FOR a company, so the viewer carries the companies
  // they approved-manage; an approved row without a slug cannot be addressed
  // over the API and is left out.
  const viewer: MembershipsViewer =
    !ready || user === null
      ? { kind: 'anonymous' }
      : {
          kind: 'signed-in',
          companies: (employerCompanies ?? []).flatMap((membership) =>
            membership.status === 'approved' && membership.company.slug
              ? [
                  {
                    slug: membership.company.slug,
                    name: membership.company.name,
                  },
                ]
              : [],
          ),
        };

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
    />
  );
}
