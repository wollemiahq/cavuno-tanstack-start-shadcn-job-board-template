/**
 * Email-verification landing — the route linked from board-auth emails.
 * The emailed link carries this deployment's origin when its publishable
 * key has a registered origin. Consumes ?token= on load.
 */
import { createFileRoute } from '@tanstack/react-router';

import { AuthCard } from '../components/auth-form';
import {
  candidateReturnTo,
  candidateSignInHref,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { getSessionUserStrict } from '../server/account';
import { verifyEmail } from '../server/auth';
import { getSeoBase } from '../server/queries';

import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';
import { cn } from '@/lib/utils';

interface VerifySearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/verify-email')({
  validateSearch: (search: UrlSearchInput): VerifySearch => ({
    token: searchString(search.token),
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadVerifyEmail(deps),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(loaderData?.seo.boardName, m.authVerifyEmail_title()),
      },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: VerifyEmailPage,
});

export async function loadVerifyEmail(
  deps: VerifySearch,
  actions: {
    getSeoBase: () => Promise<{
      boardName: string;
      language: string;
      origin: string;
    }>;
    getSessionUserStrict: () => Promise<{
      id: string;
      role?: string;
      emailVerified: boolean;
    } | null>;
    verifyEmail: (input: { data: { token: string } }) => Promise<{
      ok: boolean;
    }>;
  } = { getSeoBase, getSessionUserStrict, verifyEmail },
) {
  // Started before the token branch so it overlaps the verify call.
  const seoPromise = actions.getSeoBase();
  if (!deps.token)
    return { status: 'missing-token' as const, seo: await seoPromise };
  // Capture the session before consuming the public token. Its role is safe
  // to use only if this exact user transitions from unverified to verified;
  // an unrelated or already-verified browser session must not choose where
  // the token's subject continues.
  // An unverified (or flaky) session probe must not turn this landing into
  // the root "Something went wrong" boundary — the token is why the user is
  // here. Treat a throwing probe as signed-out and still consume the token.
  let sessionBefore: {
    id: string;
    role?: string;
    emailVerified: boolean;
  } | null = null;
  try {
    sessionBefore = await actions.getSessionUserStrict();
  } catch {
    sessionBefore = null;
  }
  try {
    const [result, seo] = await Promise.all([
      actions.verifyEmail({ data: { token: deps.token } }),
      seoPromise,
    ]);
    if (!result.ok)
      return { status: 'invalid' as const, returnTo: deps.returnTo, seo };
    const sessionAfter =
      sessionBefore && !sessionBefore.emailVerified
        ? await actions.getSessionUserStrict().catch(() => null)
        : null;
    const verifiedSameSession =
      sessionAfter !== null &&
      sessionAfter.id === sessionBefore?.id &&
      sessionAfter.emailVerified;
    return {
      status: 'verified' as const,
      returnTo:
        verifiedSameSession && sessionAfter.role === 'employer'
          ? '/employers/dashboard'
          : candidateReturnTo(deps.returnTo),
      seo,
    };
  } catch {
    return {
      status: 'invalid' as const,
      returnTo: deps.returnTo,
      seo: await seoPromise,
    };
  }
}

function VerifyEmailPage() {
  const { status, returnTo } = Route.useLoaderData();
  const search = Route.useSearch();
  const fallbackReturnTo = returnTo ?? search.returnTo;
  return <VerifyEmailView status={status} returnTo={fallbackReturnTo} />;
}

export function VerifyEmailView({
  status,
  returnTo,
}: {
  status: 'verified' | 'missing-token' | 'invalid';
  returnTo: string;
}) {
  if (status === 'verified') {
    return (
      <AuthCard
        title={m.authVerifyEmail_verifiedTitle()}
        supportingText={m.authVerifyEmail_verifiedBody()}
      >
        <a
          href={returnTo}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {m.authVerifyEmail_goToAccountLabel()}
        </a>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={m.authVerifyEmail_invalidTitle()}
      supportingText={
        status === 'missing-token'
          ? m.authVerifyEmail_missingTokenBody()
          : m.authVerifyEmail_invalidBody()
      }
    >
      <a
        href={candidateSignInHref(returnTo)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'lg' }),
          'w-full',
        )}
      >
        {m.authVerifyEmail_signInLabel()}
      </a>
    </AuthCard>
  );
}
