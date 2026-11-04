'use client';

import { useEffect, useRef, useState } from 'react';

import { m } from '../paraglide/messages';

import type { ItemVerificationActions } from './item-verification';
import type { VerifiableItem } from '@/board/item-verification';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
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

function confirmErrorText(code: string, expired: boolean): string {
  switch (code) {
    case 'item_verification_invalid_code':
      return expired
        ? m.itemVerification_codeExpiredError()
        : m.itemVerification_codeInvalidError();
    case 'item_verification_changed':
      return m.itemVerification_changedError();
    case 'item_verification_rate_limited':
    case 'rate_limited':
      return m.itemVerification_rateLimitedError();
    default:
      return m.candidateAction_errorText();
  }
}

type CodeStep = {
  step: 'code';
  email: string;
  sent: boolean;
  /** When "Resend code" is available again (epoch ms). */
  resendAt: number;
  /** When the emailed code stops working (epoch ms), if the API said. */
  expiresAt: number | null;
};

type EmailStep = { step: 'email' } | CodeStep | { step: 'team' };

/** Refusals that mean this item can't be checked by email at all. */
const NO_EMAIL_CHECK = new Set([
  'item_verification_no_domain',
  'item_verification_conflict',
]);

const CODE_SLOTS = [0, 1, 2, 3, 4, 5] as const;

/** The current time, ticking each second while `active`. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return [now, setNow] as const;
}

/**
 * The work or school email check, inline in the item's row: the address,
 * then the emailed 6-digit code. A full address is used as typed; otherwise
 * the item's domain completes it. Refusals that rule out an email check
 * offer the board team instead.
 */
export function EmailCheckPanel({
  item,
  actions,
  onCancel,
  onVerified,
  onRequestReview,
}: {
  item: VerifiableItem;
  actions: Required<ItemVerificationActions>;
  onCancel: () => void;
  onVerified: () => Promise<void>;
  onRequestReview: () => void;
}) {
  const [state, setState] = useState<EmailStep>({ step: 'email' });
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'send' | 'confirm' | null>(null);
  const pending = busy !== null;
  // State lags a render: a pasted code (auto-submit) plus Enter would both
  // pass a `pending` check, so the in-flight guard is a ref.
  const inFlight = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const [now, setNow] = useNow(state.step === 'code');
  const idPrefix = `verify-${item.itemKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const domain = item.emailDomain ?? null;

  // Move focus to the field each step asks for.
  useEffect(() => {
    if (state.step === 'email') emailInput.current?.focus();
    if (state.step === 'code') codeInput.current?.focus();
  }, [state.step]);

  const begin = (kind: 'send' | 'confirm') => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(kind);
    return true;
  };
  const end = () => {
    inFlight.current = false;
    setBusy(null);
  };

  const typed = address.trim();
  const email = domain && !typed.includes('@') ? `${typed}@${domain}` : typed;

  const send = async (to: string) => {
    if (!begin('send')) return;
    setError(null);
    try {
      const result = await actions.startEmailCheck(item.itemKey, to);
      if (result.ok) {
        const sentAt = Date.now();
        setNow(sentAt);
        setCode('');
        setState({
          step: 'code',
          email: to,
          sent: result.data.sent,
          resendAt: sentAt + (result.data.retryAfterSeconds ?? 60) * 1000,
          expiresAt: result.data.codeExpiresAt
            ? Date.parse(result.data.codeExpiresAt)
            : null,
        });
      } else if (NO_EMAIL_CHECK.has(result.code)) {
        setState({ step: 'team' });
      } else {
        setError(startErrorText(result.code));
      }
    } catch {
      setError(m.candidateAction_errorText());
    } finally {
      end();
    }
  };

  const expired =
    state.step === 'code' && state.expiresAt !== null && now >= state.expiresAt;

  const confirm = async (value: string) => {
    if (!begin('confirm')) return;
    setError(null);
    try {
      const result = await actions.confirmEmailCode(item.itemKey, value);
      if (!result.ok) {
        setError(
          confirmErrorText(
            result.code,
            state.step === 'code' &&
              state.expiresAt !== null &&
              Date.now() >= state.expiresAt,
          ),
        );
        setCode('');
        end();
        // The input is still disabled until the next render.
        requestAnimationFrame(() => codeInput.current?.focus());
        return;
      }
    } catch {
      setError(m.candidateAction_errorText());
      end();
      return;
    }
    try {
      await onVerified();
    } finally {
      end();
    }
  };

  if (state.step === 'team') {
    return (
      <div className="flex max-w-md flex-col gap-3">
        <p className="text-muted-foreground text-sm" role="status">
          {m.itemVerification_noEmailCheckBody()}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onRequestReview}>
            {m.itemVerification_askBoardLabel()}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {m.itemVerification_cancelLabel()}
          </Button>
        </div>
      </div>
    );
  }

  if (state.step === 'email') {
    return (
      <form
        className="flex max-w-md flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(email);
        }}
      >
        <Field data-invalid={error ? true : undefined} className="gap-1.5">
          <FieldLabel htmlFor={`${idPrefix}-email`}>
            {m.itemVerification_emailLabel()}
          </FieldLabel>
          <FieldDescription id={`${idPrefix}-email-hint`}>
            {m.itemVerification_emailIntro()}
          </FieldDescription>
          {domain ? (
            <InputGroup>
              <InputGroupInput
                ref={emailInput}
                id={`${idPrefix}-email`}
                type="text"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                placeholder={m.itemVerification_emailPlaceholder()}
                value={address}
                disabled={pending}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${idPrefix}-email-hint`}
                onChange={(event) => {
                  setAddress(event.target.value);
                  setError(null);
                }}
              />
              {typed.includes('@') ? null : (
                <InputGroupAddon align="inline-end" className="max-w-1/2">
                  <InputGroupText className="min-w-0">
                    <span className="truncate">@{domain}</span>
                  </InputGroupText>
                </InputGroupAddon>
              )}
            </InputGroup>
          ) : (
            <Input
              ref={emailInput}
              id={`${idPrefix}-email`}
              type="email"
              autoComplete="email"
              required
              value={address}
              disabled={pending}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${idPrefix}-email-hint`}
              onChange={(event) => {
                setAddress(event.target.value);
                setError(null);
              }}
            />
          )}
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending
              ? m.itemVerification_sendingLabel()
              : m.itemVerification_sendCodeLabel()}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onCancel}
          >
            {m.itemVerification_cancelLabel()}
          </Button>
        </div>
      </form>
    );
  }

  const resendIn = Math.max(0, Math.ceil((state.resendAt - now) / 1000));
  const shownError =
    error ?? (expired ? m.itemVerification_codeExpiredError() : null);

  return (
    <form
      className="flex max-w-md flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) void confirm(code);
      }}
    >
      <Field data-invalid={shownError ? true : undefined} className="gap-1.5">
        <FieldLabel htmlFor={`${idPrefix}-code`}>
          {m.itemVerification_codeLabel()}
        </FieldLabel>
        <FieldDescription id={`${idPrefix}-code-hint`}>
          {m.itemVerification_codeIntro({ email: state.email })}{' '}
          {state.sent
            ? m.itemVerification_linkHint()
            : m.itemVerification_alreadySentHint()}
        </FieldDescription>
        <InputOTP
          ref={codeInput}
          id={`${idPrefix}-code`}
          name="code"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          disabled={pending || expired}
          aria-describedby={`${idPrefix}-code-hint`}
          aria-invalid={shownError ? true : undefined}
          onChange={(value: string) => {
            const digits = value.replace(/\D/g, '').slice(0, 6);
            setCode(digits);
            setError(null);
            if (digits.length === 6) void confirm(digits);
          }}
        >
          <InputOTPGroup>
            {CODE_SLOTS.slice(0, 3).map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                aria-invalid={shownError ? true : undefined}
              />
            ))}
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            {CODE_SLOTS.slice(3).map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                aria-invalid={shownError ? true : undefined}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {busy === 'confirm' ? (
          <FieldDescription role="status">
            {m.itemVerification_verifyingLabel()}
          </FieldDescription>
        ) : null}
        {shownError ? <FieldError>{shownError}</FieldError> : null}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || resendIn > 0}
          onClick={() => void send(state.email)}
        >
          {resendIn > 0
            ? m.itemVerification_resendInLabel({ seconds: resendIn })
            : m.itemVerification_resendLabel()}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            setCode('');
            setState({ step: 'email' });
          }}
        >
          {m.itemVerification_changeEmailLabel()}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onCancel}
        >
          {m.itemVerification_cancelLabel()}
        </Button>
      </div>
    </form>
  );
}
