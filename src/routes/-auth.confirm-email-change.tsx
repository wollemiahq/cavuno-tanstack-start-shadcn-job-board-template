import { useState } from 'react';

import { AuthCard, FormError } from '../components/auth-form';
import { m } from '../paraglide/messages';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ConfirmEmailChangeView({
  token,
  confirmEmailChangeAction,
}: {
  token?: string;
  confirmEmailChangeAction: (input: {
    data: { token: string };
  }) => Promise<{ ok: true } | { ok: false; code: string; message: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthCard
        title={m.authConfirmEmailChange_invalidTitle()}
        supportingText={m.authConfirmEmailChange_missingTokenBody()}
      >
        <a
          href="/settings"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'w-full',
          )}
        >
          {m.authConfirmEmailChange_backToSettingsLabel()}
        </a>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title={m.authConfirmEmailChange_successTitle()}
        supportingText={m.authConfirmEmailChange_successBody()}
      >
        <a
          href="/settings"
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {m.authConfirmEmailChange_backToSettingsLabel()}
        </a>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={m.authConfirmEmailChange_title()}
      supportingText={m.authConfirmEmailChange_subtitle()}
    >
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          try {
            const result = await confirmEmailChangeAction({ data: { token } });
            if (result.ok) {
              setDone(true);
              return;
            }
            setError(
              result.code === 'email_taken'
                ? m.authConfirmEmailChange_emailTakenBody()
                : m.authConfirmEmailChange_invalidTokenBody(),
            );
          } catch {
            setError(m.candidateAction_errorText());
          } finally {
            setPending(false);
          }
        }}
      >
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? m.authConfirmEmailChange_confirmingLabel()
            : m.authConfirmEmailChange_submitLabel()}
        </Button>
        <a
          href="/settings"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'w-full',
          )}
        >
          {m.authConfirmEmailChange_backToSettingsLabel()}
        </a>
      </form>
    </AuthCard>
  );
}
