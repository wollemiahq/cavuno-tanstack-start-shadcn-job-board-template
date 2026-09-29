import { useState } from 'react';

import type { PublicBoardSignIn } from '@cavuno/board';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import {
  AuthCard,
  AuthDivider,
  Field,
  FormError,
} from '../components/auth-form';
import {
  candidateAuthSearch,
  candidateOAuthReturnTo,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';

import { GoogleIcon, LinkedInIcon } from '@/components/brand-icons';
import { AuthMailAppLinks } from '@/components/mail-app-links';
import { SsoConnectionButtons } from '@/components/sso-connection-buttons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  appendAuthConversionQuery,
  appendAuthIntentQuery,
} from '@/lib/board-datalayer-events';
import { boardErrorMessage } from '@/lib/board-error-message';
import {
  resolveBoardSignIn,
  signInRoleForReturnTo,
  ssoChoicesForRequired,
  type SsoChoice,
} from '@/lib/board-sign-in';
import { signInRedirectErrorMessage } from '@/lib/sign-in-redirect-error';
import { textActionClass, textLinkClass } from '@/lib/text-link';
import { cn } from '@/lib/utils';

type AuthActionFailure = {
  ok: false;
  code: string;
  message: string;
  /** Present on `sso_required`: the connections the account must use. */
  ssoConnectionIds?: string[];
};

export function SignInView({
  returnTo,
  notice,
  signIn,
  redirectError,
  signInAction,
  requestMagicLinkAction,
  getOAuthAuthorizationUrlAction,
  getSsoAuthorizationUrlAction,
  assignLocation,
}: {
  returnTo: string;
  notice?: 'password-reset';
  /** `board.context().signIn`; absent means every built-in method, no SSO. */
  signIn?: PublicBoardSignIn;
  /** `?error=` code a Google, LinkedIn or SSO round trip landed here with. */
  redirectError?: string;
  signInAction: (input: {
    data: { email: string; password: string };
  }) => Promise<{ ok: true; boardUser?: unknown } | AuthActionFailure>;
  requestMagicLinkAction: (input: {
    data: { email: string; returnTo?: string; intent?: 'sign_in' };
  }) => Promise<{ ok: true } | AuthActionFailure>;
  getOAuthAuthorizationUrlAction: (input: {
    data: { provider: 'google' | 'linkedin'; returnTo?: string };
  }) => Promise<
    | { ok: true; authorizeUrl: string }
    | { ok: false; code?: string; message: string }
  >;
  getSsoAuthorizationUrlAction: (input: {
    data: {
      connectionId: string;
      role: 'candidate' | 'employer';
      returnTo: string;
    };
  }) => Promise<
    | { ok: true; authorizeUrl: string }
    | { ok: false; code?: string; message: string }
  >;
  invalidate: () => Promise<void>;
  navigate: (href: string) => Promise<void>;
  assignLocation: (url: string) => void;
}) {
  const options = resolveBoardSignIn(signIn);
  const role = signInRoleForReturnTo(returnTo);
  const roleSignIn = options[role];
  const { methods } = roleSignIn;
  const [mode, setMode] = useState<'password' | 'magic'>(
    methods.password || !methods.magicLink ? 'password' : 'magic',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** The address a magic link was sent to — non-null swaps in the sent state. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  /**
   * Set when the API answered `sso_required` (to a password or magic-link
   * attempt, or on the provider redirect): only these SSO buttons remain.
   */
  const [requiredSso, setRequiredSso] = useState<SsoChoice[] | null>(() =>
    redirectError === 'sso_required'
      ? ssoChoicesForRequired(options, role)
      : null,
  );
  const ssoOnly = roleSignIn.ssoRequired || requiredSso !== null;
  const ssoChoices: SsoChoice[] =
    requiredSso ??
    roleSignIn.ssoConnections.map((connection) => ({ connection, role }));
  const showCredentialForm = methods.password || methods.magicLink;
  const showProviderButtons =
    methods.google || methods.linkedin || ssoChoices.length > 0;
  const redirectErrorText =
    redirectError && redirectError !== 'sso_required'
      ? signInRedirectErrorMessage(redirectError)
      : null;

  function handleFailure(result: AuthActionFailure) {
    if (result.code === 'sso_required') {
      setRequiredSso(
        ssoChoicesForRequired(options, role, result.ssoConnectionIds),
      );
      setError(null);
      return;
    }
    setError(boardErrorMessage(result));
  }

  async function startSso(choice: SsoChoice) {
    setPending(true);
    setError(null);
    try {
      const result = await getSsoAuthorizationUrlAction({
        data: {
          connectionId: choice.connection.id,
          role: choice.role,
          returnTo: appendAuthIntentQuery(returnTo, 'login'),
        },
      });
      if (result.ok) {
        assignLocation(result.authorizeUrl);
        return;
      }
      setError(boardErrorMessage(result));
    } catch {
      setError(m.candidateAction_errorText());
    } finally {
      setPending(false);
    }
  }

  async function startOAuth(provider: 'google' | 'linkedin') {
    setPending(true);
    setError(null);
    try {
      const result = await getOAuthAuthorizationUrlAction({
        data: {
          provider,
          returnTo: candidateOAuthReturnTo(returnTo, 'login', provider),
        },
      });
      if (result.ok) {
        assignLocation(result.authorizeUrl);
        return;
      }
      setError(boardErrorMessage(result));
    } catch {
      setError(m.candidateAction_errorText());
    } finally {
      setPending(false);
    }
  }

  // The link is out — the whole card becomes the check-your-inbox
  // instructions (OTP-page shape), not a banner above a still-live form.
  if (sentTo) {
    return (
      <AuthCard
        title={m.authSignIn_magicLinkSentTitle()}
        supportingText={m.authSignIn_magicLinkSentBody({ email: sentTo })}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <button
            type="button"
            className={textActionClass}
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                const result = await requestMagicLinkAction({
                  data: { email: sentTo, returnTo, intent: 'sign_in' },
                });
                if (!result.ok) handleFailure(result);
              } catch {
                setError(m.candidateAction_errorText());
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? m.authSignIn_sendingLabel() : m.authSignIn_resendLabel()}
          </button>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <button
            type="button"
            className={textActionClass}
            onClick={() => {
              setSentTo(null);
              setError(null);
            }}
          >
            {m.authSignIn_useDifferentEmailLabel()}
          </button>
        </div>
        <AuthMailAppLinks />
        <FormError message={error} />
      </AuthCard>
    );
  }

  if (ssoOnly) {
    return (
      <AuthCard
        title={m.authSignIn_title()}
        supportingText={m.authSso_requiredText()}
      >
        {redirectErrorText ? (
          <Alert variant="destructive">
            <AlertDescription>{redirectErrorText}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-3">
          <SsoConnectionButtons
            choices={ssoChoices}
            disabled={pending}
            onSelect={(choice) => void startSso(choice)}
          />
        </div>
        <FormError message={error} />
        {/* The prompt came from one account's answer; someone else on this
            device can still use the methods the board offers. */}
        {requiredSso !== null && !roleSignIn.ssoRequired ? (
          <button
            type="button"
            className={cn(textActionClass, 'justify-self-center text-sm')}
            onClick={() => {
              setRequiredSso(null);
              setError(null);
            }}
          >
            {m.authSso_signInAnotherWayLabel()}
          </button>
        ) : null}
      </AuthCard>
    );
  }

  return (
    <AuthCard title={m.authSignIn_title()}>
      {redirectErrorText ? (
        <Alert variant="destructive">
          <AlertDescription>{redirectErrorText}</AlertDescription>
        </Alert>
      ) : null}
      {notice === 'password-reset' ? (
        <Alert role="status">
          <AlertDescription>
            {m.authSignIn_passwordResetSuccessText()}
          </AlertDescription>
        </Alert>
      ) : null}
      {methods.password && methods.magicLink ? (
      <RadioGroup
        name="sign-in-method"
        value={mode}
        onValueChange={(next: 'password' | 'magic') => {
          setMode(next);
          setError(null);
        }}
        className="bg-muted grid grid-cols-2 gap-1 rounded-2xl p-1"
        aria-label={m.authSignIn_title()}
      >
        <label
          className={cn(
            'has-focus-visible:ring-ring/30 flex h-9 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors outline-none has-focus-visible:ring-3',
            mode === 'password'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground',
          )}
        >
          <RadioGroupItem value="password" className="sr-only" />
          {m.authSignIn_passwordTabLabel()}
        </label>
        <label
          className={cn(
            'has-focus-visible:ring-ring/30 flex h-9 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors outline-none has-focus-visible:ring-3',
            mode === 'magic'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground',
          )}
        >
          <RadioGroupItem value="magic" className="sr-only" />
          {m.authSignIn_magicLinkTabLabel()}
        </label>
      </RadioGroup>
      ) : null}

      {showCredentialForm ? (
      <form
        method="post"
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          const email = String(form.get('email'));
          let result:
            | Awaited<ReturnType<typeof signInAction>>
            | Awaited<ReturnType<typeof requestMagicLinkAction>>;
          try {
            result =
              mode === 'password'
                ? await signInAction({
                    data: {
                      email,
                      password: String(form.get('password')),
                    },
                  })
                : // A sign-in form must never recreate a deleted account:
                  // `sign_in` makes an unknown email a 404 instead of a
                  // sign-up token.
                  await requestMagicLinkAction({
                    data: {
                      email,
                      returnTo,
                      intent: 'sign_in',
                    },
                  });
          } catch {
            setError(m.candidateAction_errorText());
            setPending(false);
            return;
          }
          if (result.ok && mode === 'password') {
            // The httpOnly session is committed. A hard navigation both
            // reconciles the shell and prevents later router failures from
            // being reported as an authentication failure.
            assignLocation(
              appendAuthConversionQuery(returnTo, 'login', 'password'),
            );
            return;
          }
          if (result.ok) {
            setSentTo(email);
          } else {
            handleFailure(result);
          }
          setPending(false);
        }}
      >
        <Field
          label={m.authSignIn_emailLabel()}
          name="email"
          type="email"
          autoComplete="email"
        />
        {mode === 'password' ? (
          <Field
            label={m.authSignIn_passwordLabel()}
            name="password"
            type="password"
            autoComplete="current-password"
            labelAction={
              <Link
                className={textLinkClass}
                to="/auth/forgot-password"
                search={candidateAuthSearch(returnTo)}
              >
                {m.authSignIn_forgotPasswordLink()}
              </Link>
            }
          />
        ) : null}
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? mode === 'password'
              ? m.authSignIn_signingInLabel()
              : m.authSignIn_sendingLabel()
            : mode === 'password'
              ? m.authSignIn_submitLabel()
              : m.authSignIn_sendMagicLinkLabel()}
        </Button>
      </form>
      ) : null}

      {showCredentialForm && showProviderButtons ? (
        <AuthDivider label={m.authOrDividerLabel()} />
      ) : null}

      {showProviderButtons ? (
      <div className="flex flex-col gap-3">
        <SsoConnectionButtons
          choices={ssoChoices}
          disabled={pending}
          onSelect={(choice) => void startSso(choice)}
        />
        {methods.google ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => void startOAuth('google')}
        >
          <GoogleIcon />
          {m.authSignIn_continueWithGoogleLabel()}
        </Button>
        ) : null}
        {methods.linkedin ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => void startOAuth('linkedin')}
        >
          <LinkedInIcon className="size-4 text-[#0A66C2]" />
          {m.authSignIn_continueWithLinkedinLabel()}
        </Button>
        ) : null}
      </div>
      ) : null}

      {showCredentialForm ? null : <FormError message={error} />}
      {!showCredentialForm && !showProviderButtons ? (
        <p className="text-muted-foreground text-center text-sm">
          {m.authSso_noMethodsText()}
        </p>
      ) : null}

      {/* Mirrors the sign-up card's prompt+link footer, so the two entry
          points read as one pair rather than two conventions. */}
      <p className="text-muted-foreground text-center text-sm">
        {m.authSignIn_noAccountText()}{' '}
        <Link
          className={cn(textLinkClass, 'inline-flex items-center gap-1')}
          to="/auth/join"
          search={candidateAuthSearch(returnTo)}
        >
          {m.authSignIn_getStartedLink()}
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </p>
    </AuthCard>
  );
}
