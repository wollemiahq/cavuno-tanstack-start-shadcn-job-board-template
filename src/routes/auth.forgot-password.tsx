import { createFileRoute } from '@tanstack/react-router';

import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { forgotPassword } from '../server/auth';
import { getSeoBase } from '../server/queries';
import { ForgotPasswordView } from './-auth.forgot-password';

import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/auth/forgot-password')({
  validateSearch: (search: UrlSearchInput) => ({
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.boardName, m.authForgotPassword_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const returnTo = candidateReturnTo(Route.useSearch().returnTo);
  return (
    <ForgotPasswordView
      returnTo={returnTo}
      forgotPasswordAction={forgotPassword}
    />
  );
}
