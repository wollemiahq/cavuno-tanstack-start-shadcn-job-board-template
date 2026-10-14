/** OAuth completion landing — exchanges the callback one-time token. */
import { createFileRoute, redirect } from '@tanstack/react-router';

import { resolvePostAuthConversionRedirect } from '../lib/board-datalayer-events';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { exchangeOAuth } from '../server/auth';
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
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadOAuthComplete(deps),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
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
    exchangeOAuth: (input: {
      data: { token: string };
    }) => Promise<
      { ok: true; isNewUser: boolean } | { ok: false; message: string }
    >;
    getSeoBase: () => ReturnType<typeof getSeoBase>;
  } = { exchangeOAuth, getSeoBase },
) {
  const seoPromise = actions.getSeoBase();
  if (!deps.token) {
    return { status: 'missing-token' as const, seo: await seoPromise };
  }
  const [result, seo] = await Promise.all([
    actions.exchangeOAuth({ data: { token: deps.token } }),
    seoPromise,
  ]);
  if (!result.ok) return { status: 'invalid' as const, seo };
  throw redirect({
    href: resolvePostAuthConversionRedirect(deps.returnTo, {
      isNewUser: result.isNewUser,
      fallbackMethod: 'google',
    }),
  });
}

function OAuthCompletePage() {
  const { status } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();
  return <OAuthCompleteView status={status} returnTo={returnTo} />;
}
