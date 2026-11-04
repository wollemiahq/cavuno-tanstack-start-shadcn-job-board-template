'use client';

import { lazy, Suspense, useRef, useState } from 'react';

import { useRouter } from '@tanstack/react-router';
import { BadgeCheck, MailCheck } from 'lucide-react';

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
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import {
  reconcileCommittedAction,
  toastActionError,
  toastActionSuccess,
} from '@/lib/action-toast';
import type { ItemVerification } from '@cavuno/board';

type Failure = { ok: false; code: string };
type Result<T> = { ok: true; data: T } | Failure;

// The email check (its form and the one-time code input) loads when the
// worker opens it, so the profile pages do not carry it up front.
const EmailCheckPanel = lazy(() =>
  import('./item-verification-email-check').then((module) => ({
    default: module.EmailCheckPanel,
  })),
);

/** The writes behind the controls; the candidate profile's by default. */
export type ItemVerificationActions = {
  requestReview: (itemKey: string) => Promise<Result<unknown>>;
  startEmailCheck?: (
    itemKey: string,
    email: string,
  ) => Promise<
    Result<{
      emailDomain: string;
      sent: boolean;
      retryAfterSeconds?: number;
      codeExpiresAt?: string;
    }>
  >;
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

/**
 * An item's verification status and, while the worker may ask, its action:
 * "Verify" opens the work or school email check in place when the item can
 * be checked by email; otherwise the action asks the board team.
 */
export function ItemVerificationControl({
  item,
  actions = profileItemVerificationActions,
}: {
  item: VerifiableItem;
  actions?: ItemVerificationActions;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState(false);
  const actionButton = useRef<HTMLButtonElement>(null);
  const requestable = canRequestVerification(item.verification);
  const { startEmailCheck, confirmEmailCode } = actions;
  const emailActions =
    item.method === 'email_domain' &&
    canCheckByEmail(item.verification) &&
    startEmailCheck &&
    confirmEmailCode
      ? { ...actions, startEmailCheck, confirmEmailCode }
      : null;

  const close = () => {
    setChecking(false);
    // The action button renders again once the panel closes.
    requestAnimationFrame(() => actionButton.current?.focus());
  };

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
    setChecking(false);
    void toastActionSuccess(m.itemVerification_requestedToast());
    await reconcileCommittedAction(() => router.invalidate());
    setPending(false);
  };

  // An edit that removes the website closes the email check, so the
  // action comes back instead of leaving the item with neither.
  const showAction = requestable && !(checking && emailActions);
  const showStatusRow =
    showAction || itemVerificationStatusLabel(item.verification) !== null;
  if (!showStatusRow && !checking) return null;

  return (
    <div className="flex flex-col gap-3 pt-1">
      {showStatusRow ? (
        <div className="flex flex-wrap items-center gap-2">
          <ItemVerificationStatus verification={item.verification} />
          {showAction ? (
            <Button
              ref={actionButton}
              type="button"
              variant="outline"
              size="xs"
              disabled={pending}
              aria-label={
                emailActions
                  ? m.itemVerification_actionAriaLabel({ item: item.label })
                  : m.itemVerification_askBoardAriaLabel({ item: item.label })
              }
              onClick={() => {
                if (emailActions) setChecking(true);
                else void requestReview();
              }}
            >
              {emailActions ? (
                <MailCheck aria-hidden data-icon="inline-start" />
              ) : null}
              {emailActions
                ? m.itemVerification_verifyLabel()
                : m.itemVerification_askBoardLabel()}
            </Button>
          ) : null}
        </div>
      ) : null}
      {emailActions && checking ? (
        <Suspense fallback={null}>
          <EmailCheckPanel
            item={item}
            actions={emailActions}
            onCancel={close}
            onVerified={async () => {
              void toastActionSuccess(m.itemVerification_verifiedToast());
              await reconcileCommittedAction(() => router.invalidate());
              setChecking(false);
            }}
            onRequestReview={() => void requestReview()}
          />
        </Suspense>
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
              <ItemContent className="gap-2">
                <ItemTitle>{item.label}</ItemTitle>
                <ItemVerificationControl item={item} actions={actions} />
              </ItemContent>
            </Item>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
