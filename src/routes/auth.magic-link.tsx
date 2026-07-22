import { createFileRoute, redirect } from '@tanstack/react-router';

import { AuthCard } from '../components/auth-form';
import {
  candidateReturnTo,
  candidateSignInHref,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { consumeMagicLink } from '../server/auth';
/** Magic-link landing — consumes ?token= and creates the starter session. */
import { getSeoBase } from '../server/queries';

import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';
import { cn } from '@/lib/utils';

interface MagicLinkSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/magic-link')({
  validateSearch: (search: Record<string, unknown>): MagicLinkSearch => ({
    token:
      typeof search.token === 'string' && search.token
        ? search.token
        : undefined,
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // Started before the token branch so it overlaps the token consume.
    const seoPromise = getSeoBase();
    if (!deps.token) {
      return { status: 'missing-token' as const, seo: await seoPromise };
    }
    const [result, seo] = await Promise.all([
      consumeMagicLink({ data: { token: deps.token } }),
      seoPromise,
    ]);
    if (!result.ok) return { status: 'invalid' as const, seo };
    throw redirect({ href: deps.returnTo });
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.authMagicLink_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: MagicLinkPage,
});

function MagicLinkPage() {
  const { status } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();

  return (
    <AuthCard
      title={m.authMagicLink_invalidTitle()}
      supportingText={
        status === 'missing-token'
          ? m.authMagicLink_missingTokenBody()
          : m.authMagicLink_invalidBody()
      }
    >
      <a
        href={candidateSignInHref(returnTo)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'lg' }),
          'w-full',
        )}
      >
        {m.authMagicLink_signInLabel()}
      </a>
    </AuthCard>
  );
}
