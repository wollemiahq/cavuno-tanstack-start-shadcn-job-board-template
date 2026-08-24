/**
 * Candidate job-access paywall reference flow.
 * `offers` is public (grant-gated on password boards); the rest wrap
 * `board.me.access.*` with the session bearer + the board-access grant. The SDK
 * stays Stripe-agnostic: `startCheckout` returns a connected-account mount kit
 * that `EmbeddedCheckout` mounts with `@stripe/stripe-js`.
 */
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import {
  requireSessionMiddleware,
  type SessionContext,
} from '../lib/session-middleware';
import { gatedRead } from './board-access';
import { requireVerifiedBoardUser } from './me-verification';

import type { AccessCheckoutBody } from '@cavuno/board';

/** Bearer + board-access grant for one gated `/me/*` call. */
function authed(
  context: SessionContext & BoardAccessContext,
  grant: Record<string, string>,
) {
  return { ...context.authHeaders, ...grant };
}

/**
 * Reject anything that isn't a safe same-origin relative path before it
 * becomes a Stripe `return_url` — defence in depth (the v1 API also rejects a
 * non-relative `returnPath` server-side).
 */
function assertRelative(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('returnPath must be a relative path');
  }
  return path;
}

/** Public: the board's enabled paywall offer tiers (`[]` when the paywall is off). */
export const getPaywallOffers = createServerFn({ method: 'GET' })
  .middleware([boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, (h) => getBoard().paywall.offers({ headers: h })),
  );

/** The viewer's access entitlement — always resolves (no-access is normal). */
export const getAccessGrant = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (h) => {
      const headers = authed(context, h);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.access.grant({ headers });
    }),
  );

/**
 * Start an embedded checkout for one offer. Returns the connected-account mount
 * kit `{ sessionId, clientSecret, stripeAccountId, publishableKey, offerType }`.
 */
export const startCheckout = createServerFn({ method: 'POST' })
  .validator((input: { offerKey: string; returnPath: string }) => {
    assertRelative(input.returnPath);
    return input;
  })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (h) => {
      const headers = authed(context, h);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.access.checkout(
        {
          // A key picked from `getPaywallOffers` — the API re-validates it.
          // SAFETY: offerKey is an opaque API key selected from getPaywallOffers;
          // the pinned SDK narrows the generated type more than the wire contract.
          offerKey: data.offerKey as AccessCheckoutBody['offerKey'],
          returnPath: data.returnPath,
          colorMode: 'light',
        },
        { headers },
      );
    }),
  );

/**
 * Open a Stripe billing-portal session to manage a recurring subscription.
 * Returns the one-time portal URL to redirect the buyer to.
 */
export const openBillingPortal = createServerFn({ method: 'POST' })
  .validator((input: { returnPath: string }) => {
    assertRelative(input.returnPath);
    return input;
  })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (h) => {
      const headers = authed(context, h);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.access.portal(
        { returnPath: data.returnPath },
        { headers },
      );
    }),
  );
