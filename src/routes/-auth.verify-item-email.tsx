import { useState } from 'react';

import { Link } from '@tanstack/react-router';

import { AuthCard, FormError } from '../components/auth-form';
import { m } from '../paraglide/messages';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConfirmResult = { ok: true } | { ok: false; code: string };

type Outcome = 'verified' | 'expired' | 'changed' | 'unavailable';

const UNAVAILABLE = new Set([
  'item_verification_conflict',
  'item_verification_disabled',
  'item_verification_method_mismatch',
]);

/**
 * The page state for a refused link, from the Board API error code, or null
 * when the failure may pass (rate limit, outage) and the form should stay.
 */
export function verifyItemEmailOutcome(code: string): Outcome | null {
  if (code === 'board_auth_invalid_token') return 'expired';
  if (code === 'item_verification_changed') return 'changed';
  if (UNAVAILABLE.has(code)) return 'unavailable';
  return null;
}

function BackToProfile({ primary = false }: { primary?: boolean }) {
  return (
    <Link
      to="/account"
      className={cn(
        buttonVariants({
          variant: primary ? 'default' : 'outline',
          size: 'lg',
        }),
        'w-full',
      )}
    >
      {m.authVerifyItemEmail_backLabel()}
    </Link>
  );
}

/**
 * The emailed item verification link. A click confirms it, so a mail
 * scanner that opens the link never uses it up.
 */
export function VerifyItemEmailView({
  token,
  confirmAction,
}: {
  token?: string;
  confirmAction: (input: { data: { token: string } }) => Promise<ConfirmResult>;
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!token || outcome === 'expired') {
    return (
      <AuthCard
        title={m.authVerifyItemEmail_expiredTitle()}
        supportingText={m.authVerifyItemEmail_expiredBody()}
      >
        <BackToProfile />
      </AuthCard>
    );
  }

  if (outcome === 'verified') {
    return (
      <AuthCard
        title={m.authVerifyItemEmail_successTitle()}
        supportingText={m.authVerifyItemEmail_successBody()}
      >
        <BackToProfile primary />
      </AuthCard>
    );
  }

  if (outcome === 'changed' || outcome === 'unavailable') {
    return (
      <AuthCard
        title={m.authVerifyItemEmail_invalidTitle()}
        supportingText={
          outcome === 'changed'
            ? m.authVerifyItemEmail_changedBody()
            : m.authVerifyItemEmail_unavailableBody()
        }
      >
        <BackToProfile />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={m.authVerifyItemEmail_title()}
      supportingText={m.authVerifyItemEmail_subtitle()}
    >
      <form
        method="post"
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setFailed(false);
          try {
            const result = await confirmAction({ data: { token } });
            const next = result.ok
              ? 'verified'
              : verifyItemEmailOutcome(result.code);
            if (next) setOutcome(next);
            else setFailed(true);
          } catch {
            setFailed(true);
          } finally {
            setPending(false);
          }
        }}
      >
        <FormError message={failed ? m.candidateAction_errorText() : null} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending
            ? m.authVerifyItemEmail_confirmingLabel()
            : m.authVerifyItemEmail_submitLabel()}
        </Button>
      </form>
    </AuthCard>
  );
}
