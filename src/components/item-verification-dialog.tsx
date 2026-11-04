'use client';

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useRouter } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  type ItemVerificationActions,
  itemVerificationStatusLabel,
} from './item-verification';

import {
  canCheckByEmail,
  canRequestVerification,
  type VerifiableItem,
} from '@/board/item-verification';
import { Badge } from '@/components/ui/badge';
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
import {
  reconcileCommittedAction,
  toastActionSuccess,
} from '@/lib/action-toast';

const CONFLICT = 'item_verification_conflict';
const NO_DOMAIN = 'item_verification_no_domain';

function isRateLimited(code: string) {
  return code === 'item_verification_rate_limited' || code === 'rate_limited';
}

function startErrorText(code: string): string {
  if (isRateLimited(code)) return m.itemVerification_rateLimitedError();
  switch (code) {
    case 'item_verification_email_mismatch':
      return m.itemVerification_emailMismatchError();
    case 'validation_bad_request':
      return m.itemVerification_emailInvalidError();
    default:
      return m.candidateAction_errorText();
  }
}

function confirmErrorText(code: string, expired: boolean): string {
  if (isRateLimited(code)) return m.itemVerification_rateLimitedError();
  switch (code) {
    case 'item_verification_invalid_code':
      return expired
        ? m.itemVerification_codeExpiredError()
        : m.itemVerification_codeInvalidError();
    case 'item_verification_changed':
      return m.itemVerification_changedError();
    default:
      return m.candidateAction_errorText();
  }
}

/** Why the item goes to the board team rather than an email check. */
function teamReason(item: VerifiableItem, emailCheckable: boolean): string {
  if (!emailCheckable && item.method === 'team') {
    if (item.itemKey.startsWith('experience:')) {
      return m.itemVerification_teamExperienceBody();
    }
    if (item.itemKey.startsWith('education:')) {
      return m.itemVerification_teamEducationBody();
    }
  }
  return m.itemVerification_noEmailCheckBody();
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

type Step =
  | { step: 'email' }
  | CodeStep
  /** The API refused an email check for this item. */
  | { step: 'team' }
  /** The board team already handles or decided this item. */
  | { step: 'conflict' };

/** What the status view says for an item the worker can't act on. */
function statusText(item: VerifiableItem): string {
  const status = item.verification?.status;
  if (status !== 'pending' && !canRequestVerification(item.verification)) {
    const label = itemVerificationStatusLabel(item.verification);
    if (label) return label;
  }
  return m.itemVerification_conflictError();
}

type Busy = 'send' | 'confirm' | 'request' | null;

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
 * The whole verification flow for one item. An item checkable by email asks
 * for the work or school address, then the emailed 6-digit code; any other
 * item, or one the API won't check by email, asks the board team instead.
 */
export function ItemVerificationDialog({
  item,
  actions,
  open,
  onOpenChange,
  finalFocus,
}: {
  item: VerifiableItem;
  actions: ItemVerificationActions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where focus goes back to when the dialog closes: the item's tick. */
  finalFocus: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [state, setState] = useState<Step>({ step: 'email' });
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const pending = busy !== null;
  // State lags a render: a pasted code (auto-submit) plus Enter would both
  // pass a `pending` check, so the in-flight guard is a ref.
  const inFlight = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const [now, setNow] = useNow(open && state.step === 'code');
  const idPrefix = `verify-${item.itemKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const domain = item.emailDomain ?? null;

  // Each open starts over from the first step.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setState({ step: 'email' });
      setAddress('');
      setCode('');
      setError(null);
    }
  }

  const { startEmailCheck, confirmEmailCode } = actions;
  // Re-derived each render: an edit that removes the website moves an open
  // dialog to the board team; a status the worker can't act on shows it.
  const emailCheck =
    item.method === 'email_domain' &&
    canCheckByEmail(item.verification) &&
    startEmailCheck &&
    confirmEmailCode
      ? { startEmailCheck, confirmEmailCode }
      : null;
  const view =
    state.step === 'conflict' || !canRequestVerification(item.verification)
      ? 'status'
      : !emailCheck || state.step === 'team'
        ? 'team'
        : state.step;

  useEffect(() => {
    if (view === 'code') codeInput.current?.focus();
  }, [view]);

  const begin = (kind: Exclude<Busy, null>) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(kind);
    return true;
  };
  const end = () => {
    inFlight.current = false;
    setBusy(null);
  };

  const refresh = () => reconcileCommittedAction(() => router.invalidate());

  const toConflict = async () => {
    setError(null);
    setState({ step: 'conflict' });
    // The tick then shows the status the board team set.
    await refresh();
  };

  const typed = address.trim();
  const email = domain && !typed.includes('@') ? `${typed}@${domain}` : typed;

  const send = async (to: string) => {
    if (!emailCheck || !begin('send')) return;
    setError(null);
    try {
      const result = await emailCheck.startEmailCheck(item.itemKey, to);
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
      } else if (result.code === NO_DOMAIN) {
        setState({ step: 'team' });
      } else if (result.code === CONFLICT) {
        await toConflict();
      } else {
        setError(startErrorText(result.code));
        const wait = result.retryAfterSeconds;
        if (wait !== undefined && state.step === 'code') {
          const at = Date.now();
          setNow(at);
          setState({ ...state, resendAt: at + wait * 1000 });
        }
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
    if (!emailCheck || !begin('confirm')) return;
    setError(null);
    try {
      const result = await emailCheck.confirmEmailCode(item.itemKey, value);
      if (!result.ok) {
        if (result.code === CONFLICT) {
          await toConflict();
          end();
          return;
        }
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
    onOpenChange(false);
    void toastActionSuccess(m.itemVerification_verifiedToast());
    try {
      await refresh();
    } finally {
      end();
    }
  };

  const requestReview = async () => {
    if (!begin('request')) return;
    setError(null);
    try {
      const result = await actions.requestReview(item.itemKey);
      if (!result.ok) {
        if (result.code === CONFLICT) await toConflict();
        else
          setError(
            isRateLimited(result.code)
              ? m.itemVerification_rateLimitedError()
              : m.candidateAction_errorText(),
          );
        end();
        return;
      }
    } catch {
      setError(m.candidateAction_errorText());
      end();
      return;
    }
    onOpenChange(false);
    void toastActionSuccess(m.itemVerification_requestedToast());
    try {
      await refresh();
    } finally {
      end();
    }
  };

  const close = () => onOpenChange(false);
  const statusLabel = itemVerificationStatusLabel(item.verification);
  const negative =
    item.verification?.status === 'rejected' ||
    item.verification?.status === 'revoked';

  const cancelButton = (
    <Button type="button" variant="outline" disabled={pending} onClick={close}>
      {m.itemVerification_cancelLabel()}
    </Button>
  );

  let body: ReactNode;
  if (view === 'status') {
    body = (
      <>
        <DialogHeader>
          <DialogTitle className="pe-8">{item.label}</DialogTitle>
          <DialogDescription
            role={state.step === 'conflict' ? 'alert' : undefined}
          >
            {statusText(item)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            {m.common_closeLabel()}
          </Button>
        </DialogFooter>
      </>
    );
  } else if (view === 'team') {
    body = (
      <>
        <Header
          item={item}
          statusLabel={statusLabel}
          negative={negative}
          description={teamReason(item, emailCheck !== null)}
        />
        {error ? <FieldError>{error}</FieldError> : null}
        <DialogFooter>
          {cancelButton}
          <Button
            type="button"
            disabled={pending}
            onClick={() => void requestReview()}
          >
            {busy === 'request'
              ? m.itemVerification_sendingLabel()
              : m.itemVerification_askBoardLabel()}
          </Button>
        </DialogFooter>
      </>
    );
  } else if (view === 'email') {
    body = (
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void send(email);
        }}
      >
        <Header
          item={item}
          statusLabel={statusLabel}
          negative={negative}
          description={m.itemVerification_emailIntro()}
        />
        <Field data-invalid={error ? true : undefined} className="gap-1.5">
          <FieldLabel htmlFor={`${idPrefix}-email`}>
            {m.itemVerification_emailLabel()}
          </FieldLabel>
          {domain ? (
            <InputGroup>
              <InputGroupInput
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
              id={`${idPrefix}-email`}
              type="email"
              autoComplete="email"
              required
              value={address}
              disabled={pending}
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setAddress(event.target.value);
                setError(null);
              }}
            />
          )}
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <DialogFooter>
          {cancelButton}
          <Button type="submit" disabled={pending}>
            {busy === 'send'
              ? m.itemVerification_sendingLabel()
              : m.itemVerification_sendCodeLabel()}
          </Button>
        </DialogFooter>
      </form>
    );
  } else if (state.step === 'code') {
    const resendIn = Math.max(0, Math.ceil((state.resendAt - now) / 1000));
    const shownError =
      error ?? (expired ? m.itemVerification_codeExpiredError() : null);
    body = (
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length === 6) void confirm(code);
        }}
      >
        <Header
          item={item}
          statusLabel={statusLabel}
          negative={negative}
          description={`${m.itemVerification_codeIntro({ email: state.email })} ${
            state.sent
              ? m.itemVerification_linkHint()
              : m.itemVerification_alreadySentHint()
          }`}
        />
        <Field
          data-invalid={shownError ? true : undefined}
          className="items-center gap-2"
        >
          <FieldLabel htmlFor={`${idPrefix}-code`} className="sr-only">
            {m.itemVerification_codeLabel()}
          </FieldLabel>
          <InputOTP
            ref={codeInput}
            id={`${idPrefix}-code`}
            name="code"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            disabled={pending || expired}
            aria-invalid={shownError ? true : undefined}
            containerClassName="justify-center"
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
            <FieldDescription role="status" className="text-center">
              {m.itemVerification_verifyingLabel()}
            </FieldDescription>
          ) : null}
          {shownError ? (
            <FieldError className="text-center">{shownError}</FieldError>
          ) : null}
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-2">
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
            disabled={pending || resendIn > 0}
            onClick={() => void send(state.email)}
          >
            {resendIn > 0
              ? m.itemVerification_resendInLabel({ seconds: resendIn })
              : m.itemVerification_resendLabel()}
          </Button>
        </div>
        <DialogFooter>{cancelButton}</DialogFooter>
      </form>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A send, code check or request in flight finishes first.
        if (!next && inFlight.current) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        finalFocus={finalFocus}
        data-test="item-verification-dialog"
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}

function Header({
  item,
  statusLabel,
  negative,
  description,
}: {
  item: VerifiableItem;
  statusLabel: string | null;
  negative: boolean;
  description: string;
}) {
  return (
    <DialogHeader>
      <DialogTitle className="pe-8">
        {m.itemVerification_actionAriaLabel({ item: item.label })}
      </DialogTitle>
      {statusLabel ? (
        <Badge variant={negative ? 'destructive' : 'outline'}>
          {statusLabel}
        </Badge>
      ) : null}
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}
