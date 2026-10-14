import { useState } from 'react';

import { Link } from '@tanstack/react-router';

import { AuthCard, Field, FormError } from '../components/auth-form';
import { candidateAuthSearch } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';

import { AuthMailAppLinks } from '@/components/mail-app-links';
import { Button } from '@/components/ui/button';
import { textLinkClass } from '@/lib/text-link';

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
          <Link
            to="/auth/sign-in"
            search={candidateAuthSearch(returnTo)}
            className={textLinkClass}
          >
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
        method="post"
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
