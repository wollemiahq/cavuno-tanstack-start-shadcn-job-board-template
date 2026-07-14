/**
 * Verification-required gate for authenticated starter routes (ADR-0055).
 * The signed-in-but-unverified candidate either enters the 6-digit OTP from the
 * verification email (`board.auth.verifyEmailWithCode`) or opens the magic link
 * (which lands on `/auth/verify-email`). Resend re-sends both.
 */
import { useState } from 'react';

import { createFileRoute, useRouter } from '@tanstack/react-router';

import { AuthCard, FormError } from '../components/auth-form';
import {
  candidateReturnTo,
  candidateSignInHref,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { resendOtp, verifyOtpCode } from '../server/auth';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/auth/verify-email-required')({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo:
      typeof search.returnTo === 'string' && search.returnTo
        ? candidateReturnTo(search.returnTo)
        : undefined,
  }),
  head: () => ({ meta: [{ title: m.authVerifyEmailRequired_title() }] }),
  component: VerifyEmailRequiredPage,
});

function VerifyEmailRequiredPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const returnTo = candidateReturnTo(search.returnTo);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  return (
    <AuthCard
      title={m.authVerifyEmailRequired_cardTitle()}
      supportingText={m.authVerifyEmailRequired_introText()}
    >
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            const result = await verifyOtpCode({
              data: { code: String(form.get('code')).trim() },
            });
            if (result.ok) {
              await router.invalidate();
              await router.navigate({ href: returnTo });
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
        <Field>
          <FieldLabel htmlFor="code">
            {m.authVerifyEmailRequired_codeLabel()}
          </FieldLabel>
          <InputOTP
            id="code"
            name="code"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            data-test="otp-code"
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="size-10" />
              <InputOTPSlot index={1} className="size-10" />
              <InputOTPSlot index={2} className="size-10" />
              <InputOTPSlot index={3} className="size-10" />
              <InputOTPSlot index={4} className="size-10" />
              <InputOTPSlot index={5} className="size-10" />
            </InputOTPGroup>
          </InputOTP>
          <FormError message={error} />
        </Field>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending}
          data-test="otp-verify"
        >
          {pending
            ? m.authVerifyEmailRequired_verifyingLabel()
            : m.authVerifyEmailRequired_verifyLabel()}
        </Button>
      </form>

      {resent ? (
        <Alert role="status">
          <AlertDescription>
            {m.authVerifyEmailRequired_resentText()}
          </AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        data-test="otp-resend"
        disabled={resending}
        onClick={async () => {
          setError(null);
          setResent(false);
          setResending(true);
          try {
            const result = await resendOtp();
            if (result.ok) {
              setResent(true);
            } else {
              setError(result.message);
            }
          } catch {
            setError(m.candidateAction_errorText());
          } finally {
            setResending(false);
          }
        }}
      >
        {resending
          ? m.authVerifyEmailRequired_sendingLabel()
          : m.authVerifyEmailRequired_resendLabel()}
      </Button>

      <a
        href={candidateSignInHref(returnTo)}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'lg' }),
          'w-full',
        )}
      >
        {m.authVerifyEmailRequired_backToSignInLabel()}
      </a>
    </AuthCard>
  );
}
