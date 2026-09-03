import { createFileRoute, notFound } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  createMembershipsLoader,
  MembershipsPageView,
  type MembershipsViewer,
} from './-memberships';

import { useRootSession } from '@/components/root-session';
import {
  getMembershipsPage,
  listMembershipCompanies,
} from '@/server/membership-pages';

export const Route = createFileRoute('/memberships')({
  staticData: { ownsMain: true },
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
  const { user, ready } = useRootSession();
  const viewer: MembershipsViewer =
    !ready || user === null ? { kind: 'anonymous' } : { kind: 'signed-in' };

  return (
    <MembershipsPageView
      plans={plans}
      rosters={rosters}
      seo={seo}
      viewer={viewer}
      loadMoreMembers={listMembershipCompanies}
    />
  );
}
