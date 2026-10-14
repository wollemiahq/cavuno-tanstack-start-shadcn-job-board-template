/** Reset-password landing linked from reset emails. */
import { createFileRoute } from '@tanstack/react-router';

import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { resetPassword } from '../server/auth';
import { getSeoBase } from '../server/queries';
import { ResetPasswordView } from './-auth.reset-password';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

interface ResetSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: UrlSearchInput): ResetSearch => ({
    token: searchString(search.token),
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.boardName, m.authResetPassword_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, returnTo } = Route.useSearch();
  return (
    <ResetPasswordView
      token={token}
      returnTo={returnTo}
      resetPasswordAction={resetPassword}
      redirectToSignIn={(href) => window.location.replace(href)}
    />
  );
}
