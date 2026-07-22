import { createFileRoute, redirect } from '@tanstack/react-router';

import { AuthCard } from '../components/auth-form';
import {
  candidateReturnTo,
  candidateSignInHref,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { exchangeOAuth } from '../server/auth';
/** OAuth completion landing — exchanges the callback one-time token. */
import { getSeoBase } from '../server/queries';

import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';
import { cn } from '@/lib/utils';

interface OAuthCompleteSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/oauth-complete')({
  validateSearch: (search: Record<string, unknown>): OAuthCompleteSearch => ({
    token:
      typeof search.token === 'string' && search.token
        ? search.token
        : undefined,
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // Started before the token branch so it overlaps the exchange.
    const seoPromise = getSeoBase();
    if (!deps.token) {
      return { status: 'missing-token' as const, seo: await seoPromise };
    }
    const [result, seo] = await Promise.all([
      exchangeOAuth({ data: { token: deps.token } }),
      seoPromise,
    ]);
    if (!result.ok) return { status: 'invalid' as const, seo };
    throw redirect({ href: deps.returnTo });
  },
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

function OAuthCompletePage() {
  const { status } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();

  return (
    <AuthCard
      title={m.authOauthComplete_failedTitle()}
      supportingText={
        status === 'missing-token'
          ? m.authOauthComplete_missingTokenBody()
          : m.authOauthComplete_invalidBody()
      }
    >
      <a
        href={candidateSignInHref(returnTo)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'lg' }),
          'w-full',
        )}
      >
        {m.authOauthComplete_signInLabel()}
      </a>
    </AuthCard>
  );
}
