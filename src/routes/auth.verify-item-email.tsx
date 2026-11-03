import { createFileRoute, redirect } from '@tanstack/react-router';

import { STORED_AUTH_FLOW_TOKEN } from '../lib/auth-flow';
import { m } from '../paraglide/messages';
import { getAuthFlowState } from '../server/auth';
import { confirmItemEmailLink } from '../server/item-verification';
import { getSeoBase } from '../server/queries';
import { VerifyItemEmailView } from './-auth.verify-item-email';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

interface VerifyItemEmailSearch {
  token?: string;
}

/**
 * The link emailed for a profile item's work or school email check. The
 * request handler moves the token into an httpOnly cookie before the page
 * renders; a click confirms it, with no session needed.
 */
export const Route = createFileRoute('/auth/verify-item-email')({
  validateSearch: (search: UrlSearchInput): VerifyItemEmailSearch => ({
    token: searchString(search.token),
  }),
  beforeLoad: ({ search, location }) => {
    if (!import.meta.env.SSR && search.token)
      throw redirect({ href: location.href, reloadDocument: true });
  },
  loader: async () => ({
    seo: await getSeoBase(),
    hasToken: (await getAuthFlowState())['verify-item-email'],
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.authVerifyItemEmail_title(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: VerifyItemEmailPage,
});

function VerifyItemEmailPage() {
  const { token } = Route.useSearch();
  return (
    <VerifyItemEmailView
      token={
        token ??
        (Route.useLoaderData().hasToken ? STORED_AUTH_FLOW_TOKEN : undefined)
      }
      confirmAction={confirmItemEmailLink}
    />
  );
}
