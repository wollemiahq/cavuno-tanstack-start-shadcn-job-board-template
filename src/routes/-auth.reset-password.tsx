import { useState } from 'react';

import { Link, createFileRoute } from '@tanstack/react-router';

import { AuthCard, Field, FormError } from '../components/auth-form';
import { boardErrorMessage } from '../lib/board-error-message';
import {
  candidateAuthSearch,
  candidatePasswordResetSignInHref,
  candidateReturnTo,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { resetPassword } from '../server/auth';
/** Reset-password landing linked from reset emails. */
import { getSeoBase } from '../server/queries';

import { Button, buttonVariants } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';
import { searchString, type UrlSearchInput } from '@/lib/pagination';
import { cn } from '@/lib/utils';

interface ResetSearch {
  token?: string;
  returnTo: string;
}

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: UrlSearchInput): ResetSearch => ({
    token: searchString(search.token),
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.boardName, m.authResetPassword_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, returnTo } = Route.useSearch();
  return (
    <ResetPasswordView
      token={token}
      returnTo={returnTo}
      resetPasswordAction={resetPassword}
      redirectToSignIn={(href) => window.location.replace(href)}
    />
  );
}

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
