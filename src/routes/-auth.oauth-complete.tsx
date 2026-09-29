/** OAuth / SSO completion landing: exchanges the callback one-time token, or
 * walks an SSO sign-in through its confirm-your-inbox step. */
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  parseOAuthCompletion,
  ssoLinkProofBindingStore,
  type SsoLinkProofBindingStore,
} from '@cavuno/board';
import {
  Link,
  createFileRoute,
  getRouteApi,
  redirect,
} from '@tanstack/react-router';

import { AuthCard } from '../components/auth-form';
import { resolvePostAuthConversionRedirect } from '../lib/board-datalayer-events';
import {
  candidateReturnTo,
  candidateAuthSearch,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { consumeSsoLinkProof, exchangeOAuth } from '../server/auth';
import { getSeoBase } from '../server/queries';

import { AuthMailAppLinks } from '@/components/mail-app-links';
import { buttonVariants } from '@/components/ui/button';
import { boardErrorMessage } from '@/lib/board-error-message';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';
import { signInRedirectErrorMessage } from '@/lib/sign-in-redirect-error';
import { cn } from '@/lib/utils';

/** The completion query the API redirects here with. Every field is opaque
 * text; `parseOAuthCompletion` decides what the page does with it. */
export interface OAuthCompleteSearch {
  token?: string;
  method?: string;
  role?: string;
  isNew?: string;
  status?: string;
  linkProof?: string;
  linkProofBinding?: string;
  error?: string;
  returnTo: string;
}

const COMPLETION_KEYS = [
  'token',
  'method',
  'role',
  'isNew',
  'status',
  'linkProof',
  'linkProofBinding',
  'error',
] as const;

export function validateOAuthCompleteSearch(
  search: UrlSearchInput,
): OAuthCompleteSearch {
  const validated: OAuthCompleteSearch = {
    returnTo: candidateReturnTo(search.returnTo),
  };
  for (const key of COMPLETION_KEYS) {
    const value = searchString(search[key]);
    if (value) validated[key] = value;
  }
  return validated;
}

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/auth/oauth-complete')({
  validateSearch: validateOAuthCompleteSearch,
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

export type OAuthCompleteState =
  | { status: 'missing-token' }
  | { status: 'invalid' }
  | { status: 'error'; error: string }
  | { status: 'link-proof-sent'; linkProofBinding: string }
  | { status: 'link-proof'; linkProof: string };

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
  const completion = parseOAuthCompletion({ ...deps });
  switch (completion.kind) {
    case 'token': {
      const [result, seo] = await Promise.all([
        actions.exchangeOAuth({ data: { token: completion.token } }),
        seoPromise,
      ]);
      if (!result.ok) return { status: 'invalid' as const, seo };
      throw redirect({
        href: resolvePostAuthConversionRedirect(deps.returnTo, {
          isNewUser: result.isNewUser,
          fallbackMethod: completion.method === 'sso' ? 'sso' : 'google',
        }),
      });
    }
    // The binding and the proof pair up in this browser's storage, so both
    // steps finish in the component rather than on the server.
    case 'link_proof_sent':
      return {
        status: 'link-proof-sent' as const,
        linkProofBinding: completion.linkProofBinding,
        seo: await seoPromise,
      };
    case 'link_proof':
      return {
        status: 'link-proof' as const,
        linkProof: completion.linkProof,
        seo: await seoPromise,
      };
    case 'error':
      return {
        status: 'error' as const,
        error: completion.error,
        seo: await seoPromise,
      };
    case 'invalid':
      return { status: 'missing-token' as const, seo: await seoPromise };
  }
}

type ConsumeSsoLinkProofAction = (input: {
  data: { token: string; browserBinding?: string };
}) => Promise<
  | { ok: true; isNewUser: boolean }
  | { ok: false; code?: string; message: string }
>;

function OAuthCompletePage() {
  const { seo: _seo, ...state } = Route.useLoaderData();
  const { returnTo } = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const bindingStore = useMemo(
    () => ssoLinkProofBindingStore(board.id),
    [board.id],
  );
  return (
    <OAuthCompleteView
      state={state}
      returnTo={returnTo}
      bindingStore={bindingStore}
      consumeSsoLinkProofAction={consumeSsoLinkProof}
      assignLocation={(url) => window.location.assign(url)}
    />
  );
}

export function OAuthCompleteView({
  state,
  returnTo,
  bindingStore,
  consumeSsoLinkProofAction,
  assignLocation,
}: {
  state: OAuthCompleteState;
  returnTo: string;
  bindingStore: SsoLinkProofBindingStore;
  consumeSsoLinkProofAction: ConsumeSsoLinkProofAction;
  assignLocation: (url: string) => void;
}) {
  switch (state.status) {
    case 'link-proof-sent':
      return (
        <LinkProofSent
          linkProofBinding={state.linkProofBinding}
          bindingStore={bindingStore}
        />
      );
    case 'link-proof':
      return (
        <LinkProofConsume
          linkProof={state.linkProof}
          returnTo={returnTo}
          bindingStore={bindingStore}
          consumeSsoLinkProofAction={consumeSsoLinkProofAction}
          assignLocation={assignLocation}
        />
      );
    case 'error':
      return (
        <CompletionFailed
          returnTo={returnTo}
          title={m.authSso_failedTitle()}
          body={signInRedirectErrorMessage(state.error)}
        />
      );
    case 'missing-token':
      return (
        <CompletionFailed
          returnTo={returnTo}
          title={m.authOauthComplete_failedTitle()}
          body={m.authOauthComplete_missingTokenBody()}
        />
      );
    case 'invalid':
      return (
        <CompletionFailed
          returnTo={returnTo}
          title={m.authOauthComplete_failedTitle()}
          body={m.authOauthComplete_invalidBody()}
        />
      );
  }
}

/** The provider did not vouch for the email of an existing account, so a
 * confirmation email is on its way. Keep the binding in THIS browser: the
 * emailed link only completes where the sign-in started. */
function LinkProofSent({
  linkProofBinding,
  bindingStore,
}: {
  linkProofBinding: string;
  bindingStore: SsoLinkProofBindingStore;
}) {
  useEffect(() => {
    bindingStore.save(linkProofBinding);
  }, [bindingStore, linkProofBinding]);

  return (
    <AuthCard
      title={m.authSso_checkEmailTitle()}
      supportingText={m.authSso_checkEmailBody()}
    >
      <AuthMailAppLinks />
    </AuthCard>
  );
}

type ConsumeStatus =
  | { state: 'pending' }
  | { state: 'mismatch' }
  | { state: 'failed'; message: string };

function LinkProofConsume({
  linkProof,
  returnTo,
  bindingStore,
  consumeSsoLinkProofAction,
  assignLocation,
}: {
  linkProof: string;
  returnTo: string;
  bindingStore: SsoLinkProofBindingStore;
  consumeSsoLinkProofAction: ConsumeSsoLinkProofAction;
  assignLocation: (url: string) => void;
}) {
  const [status, setStatus] = useState<ConsumeStatus>({ state: 'pending' });
  // The proof is single-use: a re-run effect (Strict Mode, a re-render with
  // new callback identities) must not spend it twice and then report the
  // second, refused attempt as the outcome.
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (attempted.current === linkProof) return;
    attempted.current = linkProof;
    void (async () => {
      try {
        const result = await consumeSsoLinkProofAction({
          data: {
            token: linkProof,
            browserBinding: bindingStore.read() ?? undefined,
          },
        });
        if (result.ok) {
          bindingStore.clear();
          assignLocation(
            resolvePostAuthConversionRedirect(returnTo, {
              isNewUser: result.isNewUser,
              fallbackMethod: 'sso',
            }),
          );
          return;
        }
        // Opened on another device: the link stays usable where the
        // sign-in started, so leave that browser to finish it.
        setStatus(
          result.code === 'board_auth_sso_browser_mismatch'
            ? { state: 'mismatch' }
            : { state: 'failed', message: boardErrorMessage(result) },
        );
      } catch {
        setStatus({ state: 'failed', message: m.candidateAction_errorText() });
      }
    })();
  }, [
    assignLocation,
    bindingStore,
    consumeSsoLinkProofAction,
    linkProof,
    returnTo,
  ]);

  if (status.state === 'mismatch') {
    return (
      <CompletionFailed
        returnTo={returnTo}
        title={m.authSso_deviceMismatchTitle()}
        body={m.authSso_deviceMismatchBody()}
      />
    );
  }
  if (status.state === 'failed') {
    return (
      <CompletionFailed
        returnTo={returnTo}
        title={m.authSso_failedTitle()}
        body={status.message}
      />
    );
  }
  return <AuthCard title={m.authSso_finishingTitle()}>{null}</AuthCard>;
}

function CompletionFailed({
  returnTo,
  title,
  body,
}: {
  returnTo: string;
  title: string;
  body: string;
}) {
  return (
    <AuthCard title={title} supportingText={body}>
      <Link
        to="/auth/sign-in"
        search={candidateAuthSearch(returnTo)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'lg' }),
          'w-full',
        )}
      >
        {m.authOauthComplete_signInLabel()}
      </Link>
    </AuthCard>
  );
}
