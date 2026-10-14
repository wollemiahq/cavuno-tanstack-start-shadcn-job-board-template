/**
 * /alerts/manage?subscription=&token=… — the self-service page the digest
 * email's manage/unsubscribe links point to (the board's canonical domain, which
 * this starter serves). The subscription-wide token gates the read + unsubscribe
 * /resubscribe; each preference carries its own token for delete.
 *
 * The email's unsubscribe link is the manage link plus `unsubscribe=1`: the
 * page unsubscribes on arrival, then drops the param. It runs from the client,
 * not the loader, so link scanners that prefetch the email's links (they don't
 * run scripts) can't unsubscribe anyone.
 *
 * In-place filter editing is intentionally omitted: stored filters use place
 * IDs while the subscribe/update body uses place slugs (not reversible), so
 * editing would drop the location scope. Re-subscribe via the form to change
 * filters. Unsubscribe / resubscribe / delete are the full self-service set here.
 */
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';

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
    unsubscribe:
      searchString(search.unsubscribe) === '1' || search.unsubscribe === 1
        ? true
        : undefined,
  }),
  loaderDeps: ({ search }) => ({
    subscription: search.subscription,
    token: search.token,
  }),
  loader: createAlertManageLoader(),
  head: ({ loaderData }) => alertManageHead(loaderData),
  component: ManagePage,
});

function ManagePage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <ManagePageView
      data={data}
      search={Route.useSearch()}
      invalidate={async () => {
        await router.invalidate();
      }}
      clearUnsubscribeIntent={() => {
        void navigate({
          search: (prev) => ({ ...prev, unsubscribe: undefined }),
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}
