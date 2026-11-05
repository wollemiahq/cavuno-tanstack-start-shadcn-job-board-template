'use client';

import { lazy, Suspense, useRef, useState } from 'react';

import { BadgeCheck } from 'lucide-react';

import { m } from '../paraglide/messages';
import {
  confirmProfileItemEmailCode,
  startProfileItemEmailCheck,
  submitProfileItemVerification,
} from '../server/item-verification';

import {
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
import type { ItemVerification } from '@cavuno/board';

type Failure = { ok: false; code: string; retryAfterSeconds?: number };
type Result<T> = { ok: true; data: T } | Failure;

// The verification dialog (the email check, its one-time code input, and
// the request to the board team) loads when the worker opens it, so the
// profile pages do not carry it up front.

const VerificationDialog = lazy(() =>
  import('./item-verification-dialog').then((module) => ({
    default: module.ItemVerificationDialog,
  })),
);

/** The writes behind the dialog; the candidate profile's by default. */
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

/**
 * The verification indicator beside an item's title. While the worker may
 * ask, a "Verify" badge; once verified, a filled tick; otherwise the status.
 * Each opens the verification dialog: the steps while the worker may ask,
 * otherwise the status.
 */
export function ItemVerificationTick({
  item,
  actions = profileItemVerificationActions,
}: {
  item: VerifiableItem;
  actions?: ItemVerificationActions;
}) {
  const [open, setOpen] = useState(false);
  // Stays mounted after the first open so closing keeps its exit animation.
  const [dialogLoaded, setDialogLoaded] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const actionable = canRequestVerification(item.verification);
  const statusLabel = actionable
    ? null
    : itemVerificationStatusLabel(item.verification);
  const verified = item.verification?.status === 'verified';
  const shared = {
    ref: (element: HTMLElement | null) => {
      trigger.current = element;
    },
    type: 'button' as const,
    'aria-label': statusLabel
      ? m.itemVerification_statusAriaLabel({
          status: statusLabel,
          item: item.label,
        })
      : m.itemVerification_actionAriaLabel({ item: item.label }),
    'data-test': 'item-verification-tick',
    onClick: () => {
      setDialogLoaded(true);
      setOpen(true);
    },
  };

  return (
    <>
      {verified ? (
        <Button
          {...shared}
          variant="ghost"
          size="icon-xs"
          className="-m-1"
          title={statusLabel ?? undefined}
        >
          <BadgeCheck
            aria-hidden
            className="fill-verified text-verified-foreground size-4"
          />
        </Button>
      ) : (
        <Badge
          variant={statusLabel ? 'secondary' : 'outline'}
          render={<button {...shared} />}
        >
          {statusLabel ?? m.itemVerification_verifyLabel()}
        </Badge>
      )}
      {dialogLoaded ? (
        <Suspense fallback={null}>
          <VerificationDialog
            item={item}
            actions={actions}
            open={open}
            onOpenChange={setOpen}
            finalFocus={trigger}
          />
        </Suspense>
      ) : null}
    </>
  );
}

/**
 * The collection items a board verifies, each with its indicator.
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
                <ItemTitle className="flex-wrap">
                  {item.label}
                  <ItemVerificationTick item={item} actions={actions} />
                </ItemTitle>
              </ItemContent>
            </Item>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
