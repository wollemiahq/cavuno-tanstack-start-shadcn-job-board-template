/**
 * Membership checkout for the company a signed-in employer approved-manages.
 * Mirrors `talent-access.ts`: the Board API mints a connected-account
 * embedded Checkout mount kit (`board.me.companies.startMembershipCheckout`),
 * the page mounts it with Stripe.js, and after the return redirect the page
 * polls `retrieveMembershipCheckout` until the session is `complete`. The
 * plan itself is granted to the company by the platform once payment lands.
 */
import { isBoardApiError } from '@cavuno/board';
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

function authed(
  context: SessionContext & BoardAccessContext,
  grant: Record<string, string>,
) {
  return { ...context.authHeaders, ...grant };
}

/** Same defence as talent-access: never let a foreign URL become `return_url`. */
function assertRelative(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('returnPath must be a relative path');
  }
  return path;
}

/**
 * A Board API refusal is an expected outcome of buying — `membership_seat_taken`
 * when the company already holds one, `employer_not_member` when the viewer
 * lost approval — so the caller gets the `code` to word it rather than a toast.
 */
export type MembershipCheckoutResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string | null; message: string };

async function asResult<T>(
  run: () => Promise<T>,
): Promise<MembershipCheckoutResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (isBoardApiError(error)) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}

export const startMembershipCheckout = createServerFn({ method: 'POST' })
  .validator(
    (input: { companySlug: string; planId: string; returnPath: string }) => {
      assertRelative(input.returnPath);
      return input;
    },
  )
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (h) => {
      const headers = authed(context, h);
      await requireVerifiedBoardUser(headers);
      return asResult(() =>
        getBoard().me.companies.startMembershipCheckout(
          data.companySlug,
          {
            planId: data.planId,
            returnPath: data.returnPath,
            colorMode: 'light',
          },
          { headers },
        ),
      );
    }),
  );

export const getMembershipCheckoutState = createServerFn({ method: 'GET' })
  .validator((input: { companySlug: string; sessionId: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, (h) =>
      getBoard().me.companies.retrieveMembershipCheckout(
        data.companySlug,
        data.sessionId,
        { headers: authed(context, h) },
      ),
    ),
  );
