import { useState } from 'react';

import { Link } from '@tanstack/react-router';

import { AuthCard, FormError } from '../components/auth-form';
import { candidateAuthSearch } from '../lib/candidate-return-to';
import { m } from '../paraglide/messages';

import {
  EmailSuggestionHint,
  useEmailSuggestion,
} from '@/components/email-suggestion-hint';
import { AuthMailAppLinks } from '@/components/mail-app-links';
import { RegistrationField } from '@/components/registration-page';
import { Button } from '@/components/ui/button';
import { boardErrorMessage } from '@/lib/board-error-message';
import { textLinkClass } from '@/lib/text-link';

export function ForgotPasswordView({
  returnTo,
  forgotPasswordAction,
}: {
  returnTo: string;
  forgotPasswordAction: (input: {
    data: { email: string };
  }) => Promise<
    | { ok: true }
    | { ok: false; code: string; message: string; suggestion?: string }
  >;
}) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const emailSuggestion = useEmailSuggestion();
  /** The address whose domain the API refused; the email field's error. */
  const [refusedEmail, setRefusedEmail] = useState<string | null>(null);
  const changeEmail = (next: string) => {
    setEmail(next);
    emailSuggestion.clear();
    setRefusedEmail(null);
  };

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
          setRefusedEmail(null);
          try {
            const result = await forgotPasswordAction({
              data: { email },
            });
            if (result.ok) {
              setSentTo(email);
            } else if (result.code === 'email_domain_undeliverable') {
              emailSuggestion.offer(result.suggestion);
              setRefusedEmail(email);
            } else {
              setError(boardErrorMessage(result));
            }
          } catch {
            setError(m.candidateAction_errorText());
          } finally {
            setPending(false);
          }
        }}
      >
        <RegistrationField
          label={m.authForgotPassword_emailLabel()}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={changeEmail}
          onBlur={emailSuggestion.check}
          invalid={refusedEmail !== null}
        >
          <EmailSuggestionHint
            suggestion={emailSuggestion.suggestion}
            refusedEmail={refusedEmail}
            disabled={pending}
            onAccept={changeEmail}
          />
        </RegistrationField>
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
