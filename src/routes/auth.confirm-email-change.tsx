import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { confirmEmailChange } from '../server/auth';
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
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.boardName,
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
      token={token}
      confirmEmailChangeAction={confirmEmailChange}
    />
  );
}
