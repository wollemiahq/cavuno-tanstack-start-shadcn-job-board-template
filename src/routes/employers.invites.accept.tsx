import { createFileRoute, Link } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  AcceptInviteView,
  acceptReturnTo,
  loadAcceptInvite,
} from './-employers.invites.accept';

import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/employers/invites/accept')({
  validateSearch: (search: UrlSearchInput) => ({
    token: searchString(search.token) ?? '',
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps, location }) => loadAcceptInvite(deps, location),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.employerInviteAccept_title(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  staticData: { ownsMain: true },
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { state, token } = Route.useLoaderData();
  const returnTo = acceptReturnTo(token);
  return (
    <AcceptInviteView
      state={state}
      signInLink={
        <Link
          to="/auth/sign-in"
          search={{ returnTo }}
          className={buttonVariants({ variant: 'outline' })}
        >
          {m.employerInviteAccept_signInLabel()}
        </Link>
      }
    />
  );
}
