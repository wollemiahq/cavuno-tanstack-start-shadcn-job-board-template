'use client';

import { useState } from 'react';

import { m } from '../paraglide/messages';

import type { ItemVerificationActions } from './item-verification';
import type { VerifiableItem } from '@/board/item-verification';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

function startErrorText(code: string): string {
  switch (code) {
    case 'item_verification_email_mismatch':
      return m.itemVerification_emailMismatchError();
    case 'validation_bad_request':
      return m.itemVerification_emailInvalidError();
    case 'item_verification_rate_limited':
    case 'rate_limited':
      return m.itemVerification_rateLimitedError();
    default:
      return m.candidateAction_errorText();
  }
}

function confirmErrorText(code: string): string {
  switch (code) {
    case 'item_verification_invalid_code':
      return m.itemVerification_codeInvalidError();
    case 'item_verification_changed':
      return m.itemVerification_changedError();
    case 'item_verification_rate_limited':
    case 'rate_limited':
      return m.itemVerification_rateLimitedError();
    default:
      return m.candidateAction_errorText();
  }
}

type EmailStep =
  | { step: 'email' }
  | { step: 'code'; emailDomain: string; sent: boolean }
  | { step: 'team' };

/** Refusals that mean this item can't be checked by email at all. */
const NO_EMAIL_CHECK = new Set([
  'item_verification_no_domain',
  'item_verification_conflict',
]);

/** Work or school email check: enter the address, then the emailed code. */
export function EmailCheckDialog({
  item,
  actions,
  open,
  onOpenChange,
  onVerified,
  onRequestReview,
}: {
  item: VerifiableItem;
  actions: Required<ItemVerificationActions>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => Promise<void>;
  onRequestReview: () => void;
}) {
  const [state, setState] = useState<EmailStep>({ step: 'email' });
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const idPrefix = `verify-${item.itemKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const reset = () => {
    setState({ step: 'email' });
    setError(null);
  };

  const send = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await actions.startEmailCheck(item.itemKey, email.trim());
      if (result.ok) {
        setState({
          step: 'code',
          emailDomain: result.data.emailDomain,
          sent: result.data.sent,
        });
      } else if (NO_EMAIL_CHECK.has(result.code)) {
        setState({ step: 'team' });
      } else {
        setError(startErrorText(result.code));
      }
    } catch {
      setError(m.candidateAction_errorText());
    } finally {
      setPending(false);
    }
  };

  const confirm = async (code: string) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await actions.confirmEmailCode(item.itemKey, code);
      if (!result.ok) {
        setError(confirmErrorText(result.code));
        setPending(false);
        return;
      }
    } catch {
      setError(m.candidateAction_errorText());
      setPending(false);
      return;
    }
    onOpenChange(false);
    reset();
    await onVerified();
    setPending(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {m.itemVerification_dialogTitle({ item: item.label })}
          </DialogTitle>
          <DialogDescription>
            {state.step === 'email'
              ? m.itemVerification_emailIntro()
              : state.step === 'team'
                ? m.itemVerification_noEmailCheckBody()
                : m.itemVerification_codeIntro({ domain: state.emailDomain })}
          </DialogDescription>
        </DialogHeader>
        {state.step === 'team' ? (
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                reset();
                onRequestReview();
              }}
            >
              {m.itemVerification_requestLabel()}
            </Button>
          </DialogFooter>
        ) : state.step === 'email' ? (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              // The dialog renders through a portal, so its submit would
              // otherwise bubble to a surrounding React form.
              event.preventDefault();
              event.stopPropagation();
              void send();
            }}
          >
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`${idPrefix}-email`}>
                {m.itemVerification_emailLabel()}
              </FieldLabel>
              <Input
                id={`${idPrefix}-email`}
                type="email"
                autoComplete="email"
                required
                value={email}
                disabled={pending}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setEmail(event.target.value)}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending
                  ? m.itemVerification_sendingLabel()
                  : m.itemVerification_sendCodeLabel()}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const form = new FormData(event.currentTarget);
              void confirm(String(form.get('code') ?? ''));
            }}
          >
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`${idPrefix}-code`}>
                {m.itemVerification_codeLabel()}
              </FieldLabel>
              <InputOTP
                id={`${idPrefix}-code`}
                name="code"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={pending}
                onChange={(code: string) => {
                  if (code.length === 6) void confirm(code);
                }}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <FieldDescription>
                {state.sent
                  ? m.itemVerification_linkHint()
                  : m.itemVerification_alreadySentHint()}
              </FieldDescription>
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={reset}
              >
                {m.itemVerification_changeEmailLabel()}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? m.itemVerification_verifyingLabel()
                  : m.itemVerification_verifyLabel()}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
