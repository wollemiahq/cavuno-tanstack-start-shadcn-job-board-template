import { createFileRoute, useRouter } from '@tanstack/react-router';

import { redirectIfSignedIn, sessionUserOrNull } from '../lib/auth-guard';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { getOAuthAuthorizationUrl, signUp } from '../server/auth';
import { getBoardContext } from '../server/queries';
import { SignUpView } from './-auth.sign-up';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

export const Route = createFileRoute('/auth/sign-up')({
  validateSearch: (search: UrlSearchInput): { returnTo?: string } =>
    searchString(search.returnTo)
      ? { returnTo: candidateReturnTo(search.returnTo) }
      : {},
  loaderDeps: ({ search }) => ({ returnTo: search.returnTo }),
  loader: async ({ deps }) => {
    const [user, board] = await Promise.all([
      sessionUserOrNull(),
      getBoardContext(),
    ]);
    redirectIfSignedIn(user, candidateReturnTo(deps.returnTo));
    return { boardName: board.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.boardName, m.authSignUp_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();
  const { boardName } = Route.useLoaderData();
  const search = Route.useSearch();
  const returnTo = candidateReturnTo(search.returnTo);
  return (
    <SignUpView
      boardName={boardName}
      returnTo={returnTo}
      signUpAction={signUp}
      getOAuthAuthorizationUrlAction={getOAuthAuthorizationUrl}
      invalidate={async () => {
        await router.invalidate();
      }}
    />
  );
}
