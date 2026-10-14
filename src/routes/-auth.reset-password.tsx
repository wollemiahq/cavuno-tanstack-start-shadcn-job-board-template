import { useState } from 'react';

import { Link } from '@tanstack/react-router';

import { AuthCard, Field, FormError } from '../components/auth-form';
import { boardErrorMessage } from '../lib/board-error-message';
import {
  candidateAuthSearch,
  candidatePasswordResetSignInHref,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ResetPasswordView({
  token,
  returnTo,
  resetPasswordAction,
  redirectToSignIn,
}: {
  token?: string;
  returnTo: string;
  resetPasswordAction: (input: {
    data: { token: string; password: string };
  }) => Promise<{ ok: true } | { ok: false; code: string; message: string }>;
  redirectToSignIn: (href: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <AuthCard
        title={m.authResetPassword_invalidTitle()}
        supportingText={m.authResetPassword_invalidBody()}
      >
        <Link
          to="/auth/forgot-password"
          search={candidateAuthSearch(returnTo)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'w-full',
          )}
        >
          {m.authResetPassword_requestNewLinkLabel()}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={m.authResetPassword_title()}>
      <form
        method="post"
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          let result:
            | { ok: true }
            | { ok: false; code: string; message: string };
          try {
            result = await resetPasswordAction({
              data: { token, password: String(form.get('password')) },
            });
          } catch {
            setError(m.candidateAction_errorText());
            setPending(false);
            return;
          }

          if (result.ok) {
            // The reset is already committed. Leave the single-use token URL
            // immediately; later page-data reconciliation must never turn
            // this success into a reset failure.
            redirectToSignIn(candidatePasswordResetSignInHref(returnTo));
            return;
          }

          // "Link expired" only for actual token failures — a weak password
          // or rate limit deserves its own sentence, not a false claim that
          // the link is dead.
          setError(
            result.code === 'board_auth_invalid_token' ||
              result.code === 'board_auth_token_expired'
              ? m.authResetPassword_expiredError()
              : boardErrorMessage(result),
          );
          setPending(false);
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
