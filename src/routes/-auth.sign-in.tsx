import { useState } from 'react';

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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { appendAuthConversionQuery } from '@/lib/board-datalayer-events';
import { boardErrorMessage } from '@/lib/board-error-message';
import { textActionClass, textLinkClass } from '@/lib/text-link';
import { cn } from '@/lib/utils';

export function SignInView({
  returnTo,
  notice,
  signInAction,
  requestMagicLinkAction,
  getOAuthAuthorizationUrlAction,
  assignLocation,
}: {
  returnTo: string;
  notice?: 'password-reset';
  signInAction: (input: {
    data: { email: string; password: string };
  }) => Promise<
    | { ok: true; boardUser?: unknown }
    | { ok: false; code: string; message: string }
  >;
  requestMagicLinkAction: (input: {
    data: { email: string; returnTo?: string; intent?: 'sign_in' };
  }) => Promise<{ ok: true } | { ok: false; code: string; message: string }>;
  getOAuthAuthorizationUrlAction: (input: {
    data: { provider: 'google' | 'linkedin'; returnTo?: string };
  }) => Promise<
    | { ok: true; authorizeUrl: string }
    | { ok: false; code?: string; message: string }
  >;
  invalidate: () => Promise<void>;
  navigate: (href: string) => Promise<void>;
  assignLocation: (url: string) => void;
}) {
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** The address a magic link was sent to — non-null swaps in the sent state. */
  const [sentTo, setSentTo] = useState<string | null>(null);

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
                if (!result.ok) setError(boardErrorMessage(result));
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

  return (
    <AuthCard title={m.authSignIn_title()}>
      {notice === 'password-reset' ? (
        <Alert role="status">
          <AlertDescription>
            {m.authSignIn_passwordResetSuccessText()}
          </AlertDescription>
        </Alert>
      ) : null}
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

      <form
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
            setError(boardErrorMessage(result));
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

      <AuthDivider label={m.authOrDividerLabel()} />

      <div className="flex flex-col gap-3">
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
      </div>

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
