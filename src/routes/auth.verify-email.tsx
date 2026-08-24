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
import { cn } from '@/lib/utils';

interface VerifySearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    token:
      typeof search.token === 'string' && search.token
        ? search.token
        : undefined,
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // Started before the token branch so it overlaps the verify call.
    const seoPromise = getSeoBase();
    if (!deps.token)
      return { status: 'missing-token' as const, seo: await seoPromise };
    // Capture the session before consuming the public token. Its role is safe
    // to use only if this exact user transitions from unverified to verified;
    // an unrelated or already-verified browser session must not choose where
    // the token's subject continues.
    const sessionBefore = await getSessionUserStrict();
    const [result, seo] = await Promise.all([
      verifyEmail({ data: { token: deps.token } }),
      seoPromise,
    ]);
    if (!result.ok)
      return { status: 'invalid' as const, returnTo: deps.returnTo, seo };
    const sessionAfter =
      sessionBefore && !sessionBefore.emailVerified
        ? await getSessionUserStrict()
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
  },
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

function VerifyEmailPage() {
  const { status, returnTo } = Route.useLoaderData();
  const search = Route.useSearch();
  const fallbackReturnTo = returnTo ?? search.returnTo;

  if (status === 'verified') {
    return (
      <AuthCard
        title={m.authVerifyEmail_verifiedTitle()}
        supportingText={m.authVerifyEmail_verifiedBody()}
      >
        <a
          href={fallbackReturnTo}
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
        href={candidateSignInHref(fallbackReturnTo)}
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
