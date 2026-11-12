/**
 * What a job poster is told after paying. Stripe calls a checkout "complete"
 * before the platform has recorded the payment, and a bank debit completes
 * while it is still clearing, so neither the embedded `onComplete` nor the
 * return to /post/success means "paid". Both read the checkout by session
 * and word what actually happened.
 */
import { useEffect, useState } from 'react';

import { m } from '../paraglide/messages';

import type { JobPostingCheckoutStatus } from '@cavuno/board';

export type ReadJobCheckout = (input: {
  data: { sessionId: string };
}) => Promise<JobPostingCheckoutStatus>;

export type JobCheckoutOutcome = {
  kind:
    | 'live'
    | 'review'
    | 'received'
    | 'processing'
    | 'failed'
    | 'unconfirmed';
  title: string;
  body: string;
};

/** Reads are a second apart; the platform records a payment within seconds. */
const READ_ATTEMPTS = 10;

function outcomeOf(
  checkout: JobPostingCheckoutStatus | null,
): JobCheckoutOutcome {
  switch (checkout?.status) {
    case 'processing':
      return {
        kind: 'processing',
        title: m.postCheckout_processingTitle(),
        body: m.postCheckout_processingBody(),
      };
    case 'payment_failed':
    case 'canceled':
      return {
        kind: 'failed',
        title: m.postCheckout_failedTitle(),
        body: m.postCheckout_failedBody(),
      };
    case 'paid':
      if (checkout.jobStatus === 'pending_approval') {
        return {
          kind: 'review',
          title: m.postJob_pendingTitle(),
          body: m.postJob_pendingBody(),
        };
      }
      return checkout.jobStatus === 'published'
        ? {
            kind: 'live',
            title: m.postJob_publishedTitle(),
            body: m.postJob_publishedBody(),
          }
        : {
            kind: 'received',
            title: m.postCheckout_successTitle(),
            body: m.postCheckout_successBody(),
          };
    default:
      return {
        kind: 'unconfirmed',
        title: m.postCheckout_unconfirmedTitle(),
        body: m.postCheckout_unconfirmedBody(),
      };
  }
}

/**
 * The outcome of the checkout `sessionId`, or `null` while it is still being
 * read. Reads until the platform has heard from Stripe, then stops. Pass a
 * stable `read`: a new one restarts the reads.
 */
export function useJobCheckoutOutcome(
  sessionId: string | null,
  read: ReadJobCheckout,
): JobCheckoutOutcome | null {
  const [settled, setSettled] = useState<{
    sessionId: string;
    outcome: JobCheckoutOutcome;
  } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    let timerId: number | undefined;
    let attempts = 0;
    const finish = (checkout: JobPostingCheckoutStatus | null) => {
      if (!stop) setSettled({ sessionId, outcome: outcomeOf(checkout) });
    };
    const tick = async () => {
      attempts += 1;
      let checkout: JobPostingCheckoutStatus;
      try {
        checkout = await read({ data: { sessionId } });
      } catch {
        finish(null);
        return;
      }
      if (stop) return;
      if (checkout.status !== 'awaiting_payment') finish(checkout);
      else if (attempts >= READ_ATTEMPTS) finish(null);
      else timerId = window.setTimeout(tick, 1000);
    };
    void tick();
    return () => {
      stop = true;
      window.clearTimeout(timerId);
    };
  }, [read, sessionId]);

  return settled && settled.sessionId === sessionId ? settled.outcome : null;
}
