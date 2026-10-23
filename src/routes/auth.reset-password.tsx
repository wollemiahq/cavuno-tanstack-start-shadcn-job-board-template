/** Reset-password landing linked from reset emails. */
import { createFileRoute, redirect } from '@tanstack/react-router';

import { STORED_AUTH_FLOW_TOKEN } from '../lib/auth-flow';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { resetPassword, getAuthFlowState } from '../server/auth';
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
  beforeLoad: ({ search, location }) => {
    if (!import.meta.env.SSR && search.token)
      throw redirect({ href: location.href, reloadDocument: true });
  },
  loader: async () => ({
    seo: await getSeoBase(),
    hasToken: (await getAuthFlowState())['reset-password'],
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.authResetPassword_title(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, returnTo } = Route.useSearch();
  return (
    <ResetPasswordView
      token={
        token ??
        (Route.useLoaderData().hasToken ? STORED_AUTH_FLOW_TOKEN : undefined)
      }
      returnTo={returnTo}
      resetPasswordAction={resetPassword}
      redirectToSignIn={(href) => window.location.replace(href)}
    />
  );
}
