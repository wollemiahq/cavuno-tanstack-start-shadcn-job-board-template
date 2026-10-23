import { useCallback, useEffect, useRef, useState } from 'react';

import { Link } from '@tanstack/react-router';

import { AuthCard, FormError } from './auth-form';
import { Button } from './ui/button';

import {
  resolvePostAuthConversionRedirect,
  type BoardAuthMethod,
} from '@/lib/board-datalayer-events';
import { candidateAuthSearch } from '@/lib/candidate-return-to';
import { OAUTH_BROWSER_BINDING_PARAM } from '@/lib/oauth-browser-binding';
import { m } from '@/paraglide/messages';

type ExchangeResult =
  | { ok: true; isNewUser: boolean }
  | { ok: false; message: string };
const navigateBrowser = (href: string) => window.location.replace(href);

/** Exchange through a CSRF-protected POST; unbound email links require confirmation. */
export function AuthLinkConfirmation({
  token,
  returnTo,
  action,
  method,
  navigate = navigateBrowser,
  autoContinue = false,
}: {
  token: string;
  returnTo: string;
  method: BoardAuthMethod;
  action: (input: {
    data: { token: string; browserBinding?: string; confirmed?: boolean };
  }) => Promise<ExchangeResult>;
  navigate?: (href: string) => void;
  autoContinue?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const automaticRequest = useRef<Promise<ExchangeResult> | null>(null);
  const exchange = useCallback(() => {
    const browserBinding =
      method === 'magic_link'
        ? undefined
        : (new URL(returnTo, 'https://board.invalid').searchParams.get(
            OAUTH_BROWSER_BINDING_PARAM,
          ) ?? undefined);
    return action({
      data: { token, browserBinding, confirmed: !autoContinue },
    });
  }, [action, autoContinue, method, returnTo, token]);
  const finish = useCallback(
    (result: ExchangeResult) => {
      if (result.ok) {
        navigate(
          resolvePostAuthConversionRedirect(returnTo, {
            isNewUser: result.isNewUser,
            fallbackMethod: method,
          }),
        );
      } else setError(m.candidateAction_errorText());
    },
    [navigate, returnTo, method],
  );
  useEffect(() => {
    if (!autoContinue) return;
    let active = true;
    setPending(true);
    automaticRequest.current ??= exchange();
    void automaticRequest.current
      .then((result) => {
        if (active) finish(result);
      })
      .catch(() => {
        if (active) setError(m.candidateAction_errorText());
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [autoContinue, exchange, finish]);
  return (
    <AuthCard
      title={
        autoContinue
          ? method === 'magic_link'
            ? m.authMagicLink_title()
            : m.authOauthComplete_title()
          : m.authLinkConfirm_title()
      }
      supportingText={autoContinue ? undefined : m.authLinkConfirm_body()}
    >
      <form
        method="post"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          setPending(true);
          setError(null);
          try {
            finish(await exchange());
          } catch {
            setError(m.candidateAction_errorText());
          }
          setPending(false);
        }}
      >
        <FormError message={error} />
        {autoContinue && error ? (
          <Link to="/auth/sign-in" search={candidateAuthSearch(returnTo)}>
            {m.siteHeader_signInLabel()}
          </Link>
        ) : (
          <Button
            className="w-full"
            type="submit"
            disabled={pending || autoContinue}
          >
            {pending || autoContinue
              ? m.authLinkConfirm_pendingLabel()
              : m.authLinkConfirm_continueLabel()}
          </Button>
        )}
      </form>
    </AuthCard>
  );
}
