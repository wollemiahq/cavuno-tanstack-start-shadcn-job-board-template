import { createFileRoute, useRouter } from '@tanstack/react-router';

import { redirectIfSignedIn, sessionUserOrNull } from '../lib/auth-guard';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { getOAuthAuthorizationUrl, signUp } from '../server/auth';
import { getBoardContext } from '../server/queries';
import { SignUpView } from './-auth.sign-up';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

/** `email` only pre-fills the form; see `prefillEmail`. */
interface SignUpSearch {
  returnTo?: string;
  email?: string;
}

export const Route = createFileRoute('/auth/sign-up')({
  validateSearch: (search: UrlSearchInput): SignUpSearch => {
    const validated: SignUpSearch = {};
    if (searchString(search.returnTo)) {
      validated.returnTo = candidateReturnTo(search.returnTo);
    }
    const email = prefillEmail(searchString(search.email));
    if (email) validated.email = email;
    return validated;
  },
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

/**
 * `?email=` only pre-fills the field (job alert emails link here with the
 * subscriber's address); it never submits or signs anyone in. Anything that
 * is not a plausible address is dropped.
 */
function prefillEmail(value: string | undefined): string | undefined {
  const email = value?.trim();
  if (!email || email.length > 320) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function SignUpPage() {
  const router = useRouter();
  const { boardName } = Route.useLoaderData();
  const search = Route.useSearch();
  const returnTo = candidateReturnTo(search.returnTo);
  return (
    <SignUpView
      boardName={boardName}
      returnTo={returnTo}
      initialEmail={search.email}
      signUpAction={signUp}
      getOAuthAuthorizationUrlAction={getOAuthAuthorizationUrl}
      invalidate={async () => {
        await router.invalidate();
      }}
    />
  );
}
