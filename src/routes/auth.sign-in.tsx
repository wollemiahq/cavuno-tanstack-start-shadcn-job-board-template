import { createFileRoute, useRouter } from '@tanstack/react-router';

import { redirectIfAuthenticated } from '../lib/auth-guard';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import {
  getOAuthAuthorizationUrl,
  requestMagicLink,
  signIn,
} from '../server/auth';
import { getSeoBase } from '../server/queries';
import { SignInView } from './-auth.sign-in';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

type SignInSearch = { returnTo?: string; reset?: 'password' };

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: (search: UrlSearchInput): SignInSearch => {
    const validated: SignInSearch = {};
    if (searchString(search.returnTo)) {
      validated.returnTo = candidateReturnTo(search.returnTo);
    }
    if (search.reset === 'password') validated.reset = 'password';
    return validated;
  },
  loaderDeps: ({ search }) => ({ returnTo: search.returnTo }),
  loader: async ({ deps }) => {
    await redirectIfAuthenticated(candidateReturnTo(deps.returnTo));
    return getSeoBase();
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.boardName, m.authSignIn_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const returnTo = candidateReturnTo(search.returnTo);
  return (
    <SignInView
      returnTo={returnTo}
      notice={search.reset === 'password' ? 'password-reset' : undefined}
      signInAction={signIn}
      requestMagicLinkAction={requestMagicLink}
      getOAuthAuthorizationUrlAction={getOAuthAuthorizationUrl}
      invalidate={async () => {
        await router.invalidate();
      }}
      navigate={async (href) => {
        await router.navigate({ href });
      }}
      assignLocation={(url) => window.location.assign(url)}
    />
  );
}
