import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  getOAuthAuthorizationUrl,
  requestMagicLink,
  signIn,
  signOut,
  signUpInvitedEmployer,
} from '../server/auth';
import { acceptCompanyInvite } from '../server/employers';
import { loadAcceptInvite } from './-employers.invites.accept';

import { InviteJoinView } from '@/components/employer/invite-join';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

const rootApi = getRouteApi('__root__');

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
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { state, token } = Route.useLoaderData();
  const { board, contactEnabled } = rootApi.useLoaderData();
  return (
    <InviteJoinView
      // A new token (or a reload into another state) starts the card fresh.
      key={`${token}:${state.mode}`}
      state={state}
      token={token}
      board={{ name: board.name, logoUrl: board.logoUrl, contactEnabled }}
      actions={{
        signUp: signUpInvitedEmployer,
        signIn,
        requestMagicLink,
        getOAuthAuthorizationUrl,
        acceptInvite: acceptCompanyInvite,
        signOut,
        assignLocation: (url) => window.location.assign(url),
      }}
    />
  );
}
