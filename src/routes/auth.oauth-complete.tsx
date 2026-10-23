/** OAuth completion landing — exchanges the callback one-time token. */
import { createFileRoute, redirect } from '@tanstack/react-router';

import { AuthLinkConfirmation } from '../components/auth-link-confirmation';
import { STORED_AUTH_FLOW_TOKEN } from '../lib/auth-flow';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { exchangeOAuth, getAuthFlowState } from '../server/auth';
import { getSeoBase } from '../server/queries';
import { OAuthCompleteView } from './-auth.oauth-complete';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

interface OAuthCompleteSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/oauth-complete')({
  validateSearch: (search: UrlSearchInput): OAuthCompleteSearch => ({
    token: searchString(search.token),
    returnTo: candidateReturnTo(search.returnTo),
  }),
  beforeLoad: ({ search, location }) => {
    if (!import.meta.env.SSR && search.token)
      throw redirect({ href: location.href, reloadDocument: true });
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadOAuthComplete(deps),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo?.boardName,
          m.authOauthComplete_title(),
        ),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: OAuthCompletePage,
});

export async function loadOAuthComplete(
  deps: OAuthCompleteSearch,
  actions: {
    getSeoBase: () => ReturnType<typeof getSeoBase>;
    getAuthFlowState?: () => Promise<Record<string, boolean>>;
  } = { getSeoBase, getAuthFlowState },
) {
  const hasToken =
    Boolean(deps.token) ||
    Boolean((await actions.getAuthFlowState?.())?.['oauth-complete']);
  const seo = await actions.getSeoBase().catch(() => undefined);
  return {
    status: hasToken ? ('ready' as const) : ('missing-token' as const),
    seo,
  };
}

function OAuthCompletePage() {
  const { status } = Route.useLoaderData();
  const { returnTo, token } = Route.useSearch();
  if (status === 'ready')
    return (
      <AuthLinkConfirmation
        token={token ?? STORED_AUTH_FLOW_TOKEN}
        returnTo={returnTo}
        action={exchangeOAuth}
        method="google"
        autoContinue
      />
    );
  return <OAuthCompleteView status={status} returnTo={returnTo} />;
}
