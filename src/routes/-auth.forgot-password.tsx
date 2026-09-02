import { useState } from 'react';

import { Link, createFileRoute } from '@tanstack/react-router';

import { AuthCard, Field, FormError } from '../components/auth-form';
import {
  candidateReturnTo,
  candidateAuthSearch,
} from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';
import { forgotPassword } from '../server/auth';
import { getSeoBase } from '../server/queries';

import { AuthMailAppLinks } from '@/components/mail-app-links';
import { Button } from '@/components/ui/button';
import { headTitle } from '@/lib/page-title';
import type { UrlSearchInput } from '@/lib/pagination';
import { textLinkClass } from '@/lib/text-link';

export const Route = createFileRoute('/auth/forgot-password')({
  validateSearch: (search: UrlSearchInput) => ({
    returnTo: candidateReturnTo(search.returnTo),
  }),
  loader: () => getSeoBase(),
  head: ({ loaderData }) => ({
    meta: [
      { title: headTitle(loaderData?.boardName, m.authForgotPassword_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const returnTo = candidateReturnTo(Route.useSearch().returnTo);
  return (
    <ForgotPasswordView
      returnTo={returnTo}
      forgotPasswordAction={forgotPassword}
    />
  );
}

export function ForgotPasswordView({
  returnTo,
  forgotPasswordAction,
}: {
  returnTo: string;
  forgotPasswordAction: (input: {
    data: { email: string };
  }) => Promise<{ ok: true }>;
}) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sentTo) {
    return (
      <AuthCard
        title={m.authForgotPassword_checkEmailTitle()}
        supportingText={m.authForgotPassword_checkEmailBody()}
      >
        <div className="text-center text-sm">
          <Link to="/auth/sign-in" search={candidateAuthSearch(returnTo)} className={textLinkClass}>
            {m.authForgotPassword_backToSignInLabel()}
          </Link>
        </div>
        <AuthMailAppLinks />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={m.authForgotPassword_title()}>
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          const email = String(form.get('email'));
          try {
            await forgotPasswordAction({
              data: { email },
            });
            setSentTo(email);
          } catch {
            setError(m.candidateAction_errorText());
          } finally {
            setPending(false);
          }
        }}
      >
        <Field
          label={m.authForgotPassword_emailLabel()}
          name="email"
          type="email"
          autoComplete="email"
        />
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? m.authForgotPassword_sendingLabel()
            : m.authForgotPassword_submitLabel()}
        </Button>
      </form>
    </AuthCard>
  );
}
