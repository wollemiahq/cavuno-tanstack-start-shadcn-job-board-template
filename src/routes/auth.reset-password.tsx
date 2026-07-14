/** Reset-password landing — the route reset emails link to (ADR-0035). */
import { useState } from 'react';

import { createFileRoute, useRouter } from '@tanstack/react-router';

import { AuthCard, Field, FormError } from '../components/auth-form';
import {
  candidateForgotPasswordHref,
  candidateReturnTo,
  candidateSignInHref,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { resetPassword } from '../server/auth';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResetSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    token:
      typeof search.token === 'string' && search.token
        ? search.token
        : undefined,
    returnTo: candidateReturnTo(search.returnTo),
  }),
  head: () => ({ meta: [{ title: m.authResetPassword_title() }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, returnTo } = Route.useSearch();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthCard
        title={m.authResetPassword_invalidTitle()}
        supportingText={m.authResetPassword_invalidBody()}
      >
        <a
          href={candidateForgotPasswordHref(returnTo)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'w-full',
          )}
        >
          {m.authResetPassword_requestNewLinkLabel()}
        </a>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title={m.authResetPassword_updatedTitle()}
        supportingText={m.authResetPassword_updatedBody()}
      >
        <a
          href={candidateSignInHref(returnTo)}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {m.authResetPassword_signInLabel()}
        </a>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={m.authResetPassword_title()}>
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            const result = await resetPassword({
              data: { token, password: String(form.get('password')) },
            });
            if (result.ok) {
              await router.invalidate();
              setDone(true);
            } else {
              setError(m.authResetPassword_expiredError());
            }
          } catch {
            setError(m.candidateAction_errorText());
          } finally {
            setPending(false);
          }
        }}
      >
        <Field
          label={m.authResetPassword_newPasswordLabel()}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? m.authResetPassword_updatingLabel()
            : m.authResetPassword_submitLabel()}
        </Button>
      </form>
    </AuthCard>
  );
}
