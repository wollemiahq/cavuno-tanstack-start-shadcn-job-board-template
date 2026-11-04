'use client';

import { useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { BadgeCheck } from 'lucide-react';

import { m } from '../paraglide/messages';
import {
  confirmProfileItemEmailCode,
  startProfileItemEmailCheck,
  submitProfileItemVerification,
} from '../server/item-verification';

import {
  canCheckByEmail,
  canRequestVerification,
  type VerifiableItem,
} from '@/board/item-verification';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/components/ui/item';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionSuccess,
} from '@/lib/action-toast';
import type { ItemVerification } from '@cavuno/board';

type Failure = { ok: false; code: string };
type Result<T> = { ok: true; data: T } | Failure;

/** The writes behind the controls; the candidate profile's by default. */
export type ItemVerificationActions = {
  requestReview: (itemKey: string) => Promise<Result<unknown>>;
  startEmailCheck?: (
    itemKey: string,
    email: string,
  ) => Promise<Result<{ emailDomain: string; sent: boolean }>>;
  confirmEmailCode?: (
    itemKey: string,
    code: string,
  ) => Promise<Result<unknown>>;
};

export const profileItemVerificationActions: ItemVerificationActions = {
  requestReview: (itemKey) =>
    submitProfileItemVerification({ data: { itemKey } }),
  startEmailCheck: (itemKey, email) =>
    startProfileItemEmailCheck({ data: { itemKey, email } }),
  confirmEmailCode: (itemKey, code) =>
    confirmProfileItemEmailCode({ data: { itemKey, code } }),
};

/** The worker-facing label for a status, or null when there is nothing to say. */
export function itemVerificationStatusLabel(
  verification: Pick<
    ItemVerification,
    'status' | 'lapseReason' | 'verifiedDomain'
  > | null,
): string | null {
  switch (verification?.status) {
    case 'verified':
      return verification.verifiedDomain
        ? m.itemVerification_verifiedDomainLabel({
            domain: verification.verifiedDomain,
          })
        : m.itemVerification_verifiedLabel();
    case 'pending':
      return m.itemVerification_pendingLabel();
    case 'needs_info':
      return m.itemVerification_needsInfoLabel();
    case 'rejected':
      return m.itemVerification_rejectedLabel();
    case 'unable_to_verify':
      return m.itemVerification_unableLabel();
    case 'changed':
      return m.itemVerification_changedLabel();
    case 'lapsed':
      return verification.lapseReason === 'recheck_due'
        ? m.itemVerification_recheckLabel()
        : m.itemVerification_expiredLabel();
    case 'revoked':
      return m.itemVerification_revokedLabel();
    default:
      return null;
  }
}

export function ItemVerificationStatus({
  verification,
}: {
  verification: ItemVerification | null;
}) {
  const label = itemVerificationStatusLabel(verification);
  if (!label) return null;
  if (verification?.status === 'verified') {
    return (
      <Badge variant="secondary">
        <BadgeCheck aria-hidden data-icon="inline-start" />
        {label}
      </Badge>
    );
  }
  const negative =
    verification?.status === 'rejected' || verification?.status === 'revoked';
  return <Badge variant={negative ? 'destructive' : 'outline'}>{label}</Badge>;
}

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
function EmailCheckDialog({
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

/**
 * An item's verification status and, while the worker may ask, its action:
 * the email check for an item verified by email domain, otherwise a request
 * for the board team to review it.
 */
export function ItemVerificationControl({
  item,
  actions = profileItemVerificationActions,
}: {
  item: VerifiableItem;
  actions?: ItemVerificationActions;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const requestable = canRequestVerification(item.verification);
  const { startEmailCheck, confirmEmailCode } = actions;
  const emailActions =
    item.method === 'email_domain' &&
    canCheckByEmail(item.verification) &&
    startEmailCheck &&
    confirmEmailCode
      ? { ...actions, startEmailCheck, confirmEmailCode }
      : null;

  const requestReview = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await actions.requestReview(item.itemKey);
      if (!result.ok) {
        void toastActionError();
        setPending(false);
        return;
      }
    } catch {
      void toastActionError();
      setPending(false);
      return;
    }
    void toastActionSuccess(m.itemVerification_requestedToast());
    await reconcileCommittedAction(() => router.invalidate());
    setPending(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ItemVerificationStatus verification={item.verification} />
      {requestable ? (
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={pending}
          aria-label={m.itemVerification_actionAriaLabel({ item: item.label })}
          onClick={() => (emailActions ? setOpen(true) : void requestReview())}
        >
          {emailActions
            ? m.itemVerification_verifyLabel()
            : m.itemVerification_requestLabel()}
        </Button>
      ) : null}
      {emailActions ? (
        <EmailCheckDialog
          item={item}
          actions={emailActions}
          open={open}
          onOpenChange={setOpen}
          onVerified={async () => {
            void toastActionSuccess(m.itemVerification_verifiedToast());
            await reconcileCommittedAction(() => router.invalidate());
          }}
          onRequestReview={() => void requestReview()}
        />
      ) : null}
    </div>
  );
}

/**
 * The collection items a board verifies, each with its status and action.
 * Renders nothing when the board verifies none of the stored selections.
 */
export function ItemVerificationCard({
  items,
  actions,
}: {
  items: readonly VerifiableItem[];
  actions?: ItemVerificationActions;
}) {
  if (items.length === 0) return null;
  return (
    <Card id="verification" data-test="item-verification-card">
      <CardHeader>
        <CardTitle>
          <h2>{m.itemVerification_heading()}</h2>
        </CardTitle>
        <CardDescription>{m.itemVerification_intro()}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <Item
              key={item.itemKey}
              variant="outline"
              size="sm"
              render={<li />}
            >
              <ItemContent>
                <ItemTitle>{item.label}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <ItemVerificationControl item={item} actions={actions} />
              </ItemActions>
            </Item>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
