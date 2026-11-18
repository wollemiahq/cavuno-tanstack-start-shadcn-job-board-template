/**
 * /alerts/manage — the self-service page the digest email's manage and
 * unsubscribe links point to (the board's canonical domain, which this
 * starter serves). The link's subscription-wide token gates the read,
 * unsubscribe and resubscribe; each preference carries its own token for
 * delete.
 *
 * The link's `subscription` and `token` never stay in the address bar: the
 * loader keeps them in an httpOnly cookie and redirects to
 * `/alerts/manage?link=…`, a random key for that cookie, so analytics,
 * referrers and screenshots don't capture them.
 *
 * The email's Unsubscribe link is the manage link plus `unsubscribe=1`,
 * which the page ignores. Opening it changes nothing, because link checkers
 * open every link in a message; unsubscribing takes the header's button.
 *
 * In-place filter editing is intentionally omitted: stored filters use place
 * IDs while the subscribe/update body uses place slugs (not reversible), so
 * editing would drop the location scope. Re-subscribe via the form to change
 * filters. Unsubscribe / resubscribe / delete are the full self-service set here.
 */
import { createFileRoute, useRouter } from '@tanstack/react-router';

import { ManagePageView } from './-alerts.manage';
import {
  alertManageHead,
  createAlertManageLoader,
  type ManageSearch,
} from './-alerts.manage-loader';

import { searchString, type UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/alerts/manage')({
  staticData: { ownsMain: true },
  validateSearch: (search: UrlSearchInput): ManageSearch => ({
    subscription: searchString(search.subscription),
    token: searchString(search.token),
    link: searchString(search.link),
  }),
  loaderDeps: ({ search }) => search,
  loader: createAlertManageLoader(),
  head: ({ loaderData }) => alertManageHead(loaderData),
  component: ManagePage,
});

function ManagePage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  return (
    <ManagePageView
      data={data}
      search={Route.useSearch()}
      invalidate={async () => {
        await router.invalidate();
      }}
    />
  );
}
