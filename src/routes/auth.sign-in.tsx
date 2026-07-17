import { useState } from 'react';

import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import {
  AuthCard,
  AuthDivider,
  Field,
  FormError,
} from '../components/auth-form';
import {
  candidateForgotPasswordHref,
  candidateJoinHref,
  candidateReturnTo,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import {
  getOAuthAuthorizationUrl,
  requestMagicLink,
  signIn,
} from '../server/auth';

import { GoogleIcon, LinkedInIcon } from '@/components/brand-icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo:
      typeof search.returnTo === 'string' && search.returnTo
        ? candidateReturnTo(search.returnTo)
        : undefined,
  }),
  head: () => ({ meta: [{ title: m.authSignIn_title() }] }),
  component: SignInPage,
});

function SignInPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const returnTo = candidateReturnTo(search.returnTo);
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** The address a magic link was sent to — non-null swaps in the sent state. */
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function startOAuth(provider: 'google' | 'linkedin') {
    setPending(true);
    setError(null);
    try {
      const result = await getOAuthAuthorizationUrl({
        data: { provider, returnTo },
      });
      if (result.ok) {
        window.location.assign(result.authorizeUrl);
        return;
      }
      setError(result.message);
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
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href="https://mail.google.com/"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            {m.authSignIn_openGmailLabel()}
          </a>
          <a
            href="https://outlook.live.com/mail/"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            {m.authSignIn_openOutlookLabel()}
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                const result = await requestMagicLink({
                  data: { email: sentTo, returnTo },
                });
                if (!result.ok) setError(result.message);
              } catch {
                setError(m.candidateAction_errorText());
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? m.authSignIn_sendingLabel() : m.authSignIn_resendLabel()}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSentTo(null);
              setError(null);
            }}
          >
            {m.authSignIn_useDifferentEmailLabel()}
          </Button>
        </div>
        <FormError message={error} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={m.authSignIn_title()}>
      <RadioGroup
        name="sign-in-method"
        value={mode}
        onValueChange={(next) => {
          setMode(next as 'password' | 'magic');
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
          try {
            const result =
              mode === 'password'
                ? await signIn({
                    data: {
                      email,
                      password: String(form.get('password')),
                    },
                  })
                : await requestMagicLink({
                    data: {
                      email,
                      returnTo,
                    },
                  });
            if (result.ok && mode === 'password') {
              await router.invalidate();
              await router.navigate({ href: returnTo });
            } else if (result.ok) {
              setSentTo(email);
            } else {
              setError(result.message);
            }
          } catch {
            setError(m.candidateAction_errorText());
          } finally {
            setPending(false);
          }
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
              <a
                className={buttonVariants({
                  variant: 'link',
                  size: 'sm',
                  className: 'h-auto p-0',
                })}
                href={candidateForgotPasswordHref(returnTo)}
              >
                {m.authSignIn_forgotPasswordLink()}
              </a>
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
        <a
          className={buttonVariants({ variant: 'link', size: 'sm' })}
          href={candidateJoinHref(returnTo)}
        >
          {m.authSignIn_getStartedLink()}
          <ArrowRight data-icon="inline-end" />
        </a>
      </p>
    </AuthCard>
  );
}
