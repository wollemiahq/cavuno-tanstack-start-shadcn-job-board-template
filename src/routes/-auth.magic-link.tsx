import { Link, createFileRoute, redirect } from '@tanstack/react-router';

import { AuthCard } from '../components/auth-form';
import { resolvePostAuthConversionRedirect } from '../lib/board-datalayer-events';
import {
  candidateReturnTo,
  candidateAuthSearch,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { consumeMagicLink } from '../server/auth';
/** Magic-link landing — consumes ?token= and creates the starter session. */
import { getSeoBase } from '../server/queries';

import { buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';
import { cn } from '@/lib/utils';

interface MagicLinkSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/magic-link')({
  validateSearch: (search: UrlSearchInput): MagicLinkSearch => ({
    token: searchString(search.token),
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadMagicLink(deps),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.authMagicLink_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: MagicLinkPage,
});

export async function loadMagicLink(
  deps: MagicLinkSearch,
  actions: {
    consumeMagicLink: (input: {
      data: { token: string };
    }) => Promise<
      { ok: true; isNewUser: boolean } | { ok: false; message: string }
    >;
    getSeoBase: () => ReturnType<typeof getSeoBase>;
  } = { consumeMagicLink, getSeoBase },
) {
  const seoPromise = actions.getSeoBase();
  if (!deps.token) {
    return { status: 'missing-token' as const, seo: await seoPromise };
  }
  const [result, seo] = await Promise.all([
    actions.consumeMagicLink({ data: { token: deps.token } }),
    seoPromise,
  ]);
  if (!result.ok) return { status: 'invalid' as const, seo };
  throw redirect({
    href: resolvePostAuthConversionRedirect(deps.returnTo, {
      isNewUser: result.isNewUser,
      fallbackMethod: 'magic_link',
    }),
  });
}

function MagicLinkPage() {
  const { status } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();
  return <MagicLinkView status={status} returnTo={returnTo} />;
}

export function MagicLinkView({
  status,
  returnTo,
}: {
  status: 'missing-token' | 'invalid';
  returnTo: string;
}) {
  return (
    <AuthCard
      title={m.authMagicLink_invalidTitle()}
      supportingText={
        status === 'missing-token'
          ? m.authMagicLink_missingTokenBody()
          : m.authMagicLink_invalidBody()
      }
    >
      <Link
        to="/auth/sign-in"
        search={candidateAuthSearch(returnTo)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'lg' }),
          'w-full',
        )}
      >
        {m.authMagicLink_signInLabel()}
      </Link>
    </AuthCard>
  );
}
