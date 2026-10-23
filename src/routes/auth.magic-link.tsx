/** Magic-link landing — consumes ?token= and creates the starter session. */
import { createFileRoute, redirect } from '@tanstack/react-router';

import { AuthLinkConfirmation } from '../components/auth-link-confirmation';
import { STORED_AUTH_FLOW_TOKEN } from '../lib/auth-flow';
import { candidateReturnTo } from '../lib/candidate-return-to';
import { MAGIC_LINK_BROWSER_BINDING_PARAM } from '../lib/magic-link-intent';
import { m } from '../paraglide/messages';
import { consumeMagicLink, getAuthFlowState } from '../server/auth';
import { getSeoBase } from '../server/queries';
import { MagicLinkView } from './-auth.magic-link';

import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

interface MagicLinkSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/magic-link')({
  validateSearch: (search: UrlSearchInput): MagicLinkSearch => ({
    token: searchString(search.token),
    returnTo: candidateReturnTo(search.returnTo),
  }),
  beforeLoad: ({ search, location }) => {
    if (!import.meta.env.SSR && search.token)
      throw redirect({ href: location.href, reloadDocument: true });
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadMagicLink(deps),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.seo?.boardName, m.authMagicLink_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: MagicLinkPage,
});

export async function loadMagicLink(
  deps: MagicLinkSearch,
  actions: {
    getSeoBase: () => ReturnType<typeof getSeoBase>;
    getAuthFlowState?: (input: {
      data: { magicLinkBinding?: string };
    }) => Promise<Record<string, boolean>>;
  } = { getSeoBase, getAuthFlowState },
) {
  const flow = await actions.getAuthFlowState?.({
    data: {
      magicLinkBinding:
        new URL(deps.returnTo, 'https://board.invalid').searchParams.get(
          MAGIC_LINK_BROWSER_BINDING_PARAM,
        ) ?? undefined,
    },
  });
  const hasToken = Boolean(deps.token) || Boolean(flow?.['magic-link']);
  const seo = await actions.getSeoBase().catch(() => undefined);
  return {
    status: hasToken ? ('ready' as const) : ('missing-token' as const),
    automatic: Boolean(flow?.['magic-link-requested']),
    seo,
  };
}

function MagicLinkPage() {
  const { status, automatic } = Route.useLoaderData();
  const { returnTo, token } = Route.useSearch();
  if (status === 'ready')
    return (
      <AuthLinkConfirmation
        token={token ?? STORED_AUTH_FLOW_TOKEN}
        returnTo={returnTo}
        action={consumeMagicLink}
        method="magic_link"
        autoContinue={automatic}
      />
    );
  return <MagicLinkView status={status} returnTo={returnTo} />;
}
