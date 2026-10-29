/**
 * The download page and the buyer library, over `board.purchases.*`.
 *
 * The purchase token in the URL is the buyer's credential. These reads skip
 * the board password (the API does too: a buyer reaches what they paid for
 * even if the board is later locked) and are never edge-cached: every call
 * is `no-store`, and the email confirmation travels in its own header from
 * a host-owned httpOnly cookie (src/lib/purchase-confirmation-cookie.ts).
 *
 * A shared link that the API wants confirmed comes back as
 * `{ state: 'confirm' }` rather than an error, so the page can ask for the
 * purchase email in place.
 */
import { isBoardApiError, isNotFound } from '@cavuno/board';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import {
  appendResponseHeader,
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { readBoardContext } from '../lib/board-context-cache';
import {
  findPurchaseConfirmation,
  purchaseFingerprint,
  serializePurchaseConfirmation,
} from '../lib/purchase-confirmation-cookie';
import {
  requireSessionMiddleware,
  sessionMiddleware,
  type SessionContext,
} from '../lib/session-middleware';

import type {
  Purchase,
  PurchaseDownload,
  PurchaseDownloadAll,
  PurchaseReviewResult,
} from '@cavuno/board';

export const PURCHASE_CONFIRMATION_REQUIRED =
  'purchase_email_confirmation_required';

type PurchaseCall = {
  confirmationToken: string | null;
  headers: Record<string, string>;
  cache: 'no-store';
};

/** The stored confirmation (if any) plus the signed-in bearer (if any). */
async function purchaseCall(
  context: SessionContext,
  purchaseToken: string,
): Promise<PurchaseCall> {
  const fingerprint = await purchaseFingerprint(purchaseToken);
  return {
    confirmationToken: findPurchaseConfirmation(
      getRequestHeader('cookie') ?? null,
      fingerprint,
    ),
    // A signed-in buyer passes the shared-link check by account.
    headers: context.authHeaders,
    cache: 'no-store',
  };
}

/** Remember a confirmation the API handed back, for later requests. */
async function rememberConfirmation(
  purchaseToken: string,
  confirmationToken: string | null | undefined,
) {
  if (!confirmationToken) return;
  const cookie = serializePurchaseConfirmation(
    getRequestHeader('cookie') ?? null,
    await purchaseFingerprint(purchaseToken),
    confirmationToken,
  );
  if (cookie) appendResponseHeader('Set-Cookie', cookie);
}

export type PurchaseActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string | null; message: string };

async function asResult<T>(
  run: () => Promise<T>,
): Promise<PurchaseActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (isBoardApiError(error)) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}

export type PurchasePageData =
  | { state: 'ready'; purchase: Purchase; boardName: string }
  | { state: 'confirm'; boardName: string }
  | { state: 'unavailable'; code: string; boardName: string };

/** Purchase states the API refuses with a code worth explaining. */
const UNAVAILABLE_CODES = new Set([
  'purchase_unavailable',
  'purchase_access_removed',
  'purchase_awaiting_payment',
  'purchase_refunded',
]);

/** `/purchases/$purchaseToken` — the download page. */
export const getPurchasePage = createServerFn({ method: 'GET' })
  .validator((input: { purchaseToken: string }) => input)
  .middleware([sessionMiddleware])
  .handler(async ({ data, context }): Promise<PurchasePageData> => {
    // The token is the buyer's credential: never let a cache keep this page.
    setResponseHeader('Cache-Control', 'private, no-store');
    const [call, boardContext] = await Promise.all([
      purchaseCall(context, data.purchaseToken),
      readBoardContext(),
    ]);
    const boardName = boardContext.name;
    try {
      const purchase = await getBoard().purchases.get(data.purchaseToken, call);
      await rememberConfirmation(
        data.purchaseToken,
        purchase.confirmationToken,
      );
      return { state: 'ready', purchase, boardName };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      if (isBoardApiError(error)) {
        if (error.code === PURCHASE_CONFIRMATION_REQUIRED) {
          return { state: 'confirm', boardName };
        }
        if (error.code && UNAVAILABLE_CODES.has(error.code)) {
          return { state: 'unavailable', code: error.code, boardName };
        }
      }
      throw error;
    }
  });

/** The shared-link check: the buyer types the purchase email. */
export const confirmPurchaseEmail = createServerFn({ method: 'POST' })
  .validator((input: { purchaseToken: string; email: string }) => input)
  .handler(({ data }) =>
    asResult(async () => {
      const result = await getBoard().purchases.confirmEmail(
        data.purchaseToken,
        { email: data.email },
        { cache: 'no-store' },
      );
      await rememberConfirmation(data.purchaseToken, result.confirmationToken);
      return { confirmed: true as const };
    }),
  );

/** Count one download and get the signed, short-lived file link. */
export const downloadPurchaseFile = createServerFn({ method: 'POST' })
  .validator((input: { purchaseToken: string; fileId: string }) => input)
  .middleware([sessionMiddleware])
  .handler(({ data, context }) =>
    asResult<PurchaseDownload>(async () => {
      const call = await purchaseCall(context, data.purchaseToken);
      const result = await getBoard().purchases.download(
        data.purchaseToken,
        data.fileId,
        call,
      );
      await rememberConfirmation(data.purchaseToken, result.confirmationToken);
      return result;
    }),
  );

/** One short-lived ZIP link for every ready file. */
export const downloadAllPurchaseFiles = createServerFn({ method: 'POST' })
  .validator((input: { purchaseToken: string }) => input)
  .middleware([sessionMiddleware])
  .handler(({ data, context }) =>
    asResult<PurchaseDownloadAll>(async () => {
      const call = await purchaseCall(context, data.purchaseToken);
      const result = await getBoard().purchases.downloadAll(
        data.purchaseToken,
        call,
      );
      await rememberConfirmation(data.purchaseToken, result.confirmationToken);
      return result;
    }),
  );

/** Write or replace the buyer's own review. */
export const reviewPurchase = createServerFn({ method: 'POST' })
  .validator(
    (input: {
      purchaseToken: string;
      stars: number;
      comment?: string;
      displayName?: string;
    }) => input,
  )
  .middleware([sessionMiddleware])
  .handler(({ data, context }) =>
    asResult<PurchaseReviewResult>(async () => {
      const call = await purchaseCall(context, data.purchaseToken);
      return getBoard().purchases.review(
        data.purchaseToken,
        {
          stars: data.stars,
          comment: data.comment || undefined,
          displayName: data.displayName || undefined,
        },
        call,
      );
    }),
  );

/** `/me/purchases` — the signed-in user's library. */
export const getMyPurchases = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware])
  .handler(({ context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    return getBoard().purchases.mine({
      headers: context.authHeaders,
      cache: 'no-store',
    });
  });
