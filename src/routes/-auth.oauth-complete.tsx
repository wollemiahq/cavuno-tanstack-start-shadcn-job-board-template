/** OAuth / SSO completion landing: exchanges the callback one-time token, or
 * walks an SSO sign-in through its confirm-your-inbox step. */
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  ssoLinkProofBindingStore,
  type SsoLinkProofBindingStore,
} from '@cavuno/board';
import { Link, getRouteApi } from '@tanstack/react-router';

import { AuthCard } from '../components/auth-form';
import { resolvePostAuthConversionRedirect } from '../lib/board-datalayer-events';
import { candidateAuthSearch } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { consumeSsoLinkProof } from '../server/auth';

import type { OAuthCompleteState } from './-auth.oauth-complete-loader';
import { AuthMailAppLinks } from '@/components/mail-app-links';
import { buttonVariants } from '@/components/ui/button';
import { boardErrorMessage } from '@/lib/board-error-message';
import { signInRedirectErrorMessage } from '@/lib/sign-in-redirect-error';
import { cn } from '@/lib/utils';

const rootApi = getRouteApi('__root__');
const routeApi = getRouteApi('/auth/oauth-complete');

type ConsumeSsoLinkProofAction = (input: {
  data: { token: string; browserBinding?: string };
}) => Promise<
  | { ok: true; isNewUser: boolean }
  | { ok: false; code?: string; message: string }
>;

export function OAuthCompletePage() {
  const { seo: _seo, ...state } = routeApi.useLoaderData();
  const { returnTo } = routeApi.useSearch();
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
