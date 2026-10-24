import { createFileRoute, redirect } from '@tanstack/react-router';

import { STORED_AUTH_FLOW_TOKEN } from '../lib/auth-flow';
import { m } from '../paraglide/messages';
import { confirmEmailChange, getAuthFlowState } from '../server/auth';
import { getSeoBase } from '../server/queries';
import { ConfirmEmailChangeView } from './-auth.confirm-email-change';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

interface ConfirmEmailChangeSearch {
  token?: string;
}

export const Route = createFileRoute('/auth/confirm-email-change')({
  validateSearch: (search: UrlSearchInput): ConfirmEmailChangeSearch => ({
    token: searchString(search.token),
  }),
  beforeLoad: ({ search, location }) => {
    if (!import.meta.env.SSR && search.token)
      throw redirect({ href: location.href, reloadDocument: true });
  },
  loader: async () => ({
    seo: await getSeoBase(),
    hasToken: (await getAuthFlowState())['confirm-email-change'],
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.authConfirmEmailChange_title(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ConfirmEmailChangePage,
});

function ConfirmEmailChangePage() {
  const { token } = Route.useSearch();
  return (
    <ConfirmEmailChangeView
      token={
        token ??
        (Route.useLoaderData().hasToken ? STORED_AUTH_FLOW_TOKEN : undefined)
      }
      confirmEmailChangeAction={confirmEmailChange}
    />
  );
}
