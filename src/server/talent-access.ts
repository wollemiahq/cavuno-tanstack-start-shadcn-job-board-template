/**
 * Employer talent-access entitlement. `retrieve` is the CTA signal
 * (`hasTalentAccess`); checkout, unlock, upgrade, and the company billing
 * portal use the typed `board.me.talentAccess.*` / `billingPortal` methods.
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

import type { TalentAccess } from '@cavuno/board';

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

/**
 * Write outcome envelope, matching `startConversation`: a Board API refusal is
 * an expected outcome of buying, not a crash, and the caller needs the `code`
 * to word it (`company_required` asks the buyer to pick a company;
 * `already_on_plan` is not a failure at all). Throwing would flatten every one
 * of those into a generic toast.
 */
export type TalentAccessResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string | null; message: string };

async function asResult<T>(
  run: () => Promise<T>,
): Promise<TalentAccessResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (isBoardApiError(error)) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}

export type TalentAccessGrant = TalentAccess;

export const EMPTY_GRANT: TalentAccessGrant = {
  object: 'talent_access',
  isEmployer: false,
  paywallActive: false,
  hasTalentAccess: false,
  hasUnlimitedUnlocks: false,
  accessModel: 'none',
  companyId: null,
  unlockCreditsRemaining: 0,
  messageCreditsRemaining: 0,
  hasUnlimitedMessages: false,
};

/** Viewer talent entitlement. Call from a signed-in session; 401/403 → empty. */
export const getTalentAccessGrant = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (h) => {
      const headers = authed(context, h);
      try {
        return await getBoard().me.talentAccess.retrieve({ headers });
      } catch (error) {
        if (
          isBoardApiError(error) &&
          (error.status === 401 || error.status === 403)
        ) {
          return EMPTY_GRANT;
        }
        throw error;
      }
    }),
  );

export const startTalentAccessCheckout = createServerFn({ method: 'POST' })
  .validator(
    (input: { planId: string; returnPath: string; companyId?: string }) => {
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
        getBoard().me.talentAccess.checkout(
          {
            planId: data.planId,
            returnPath: data.returnPath,
            colorMode: 'light',
            companyId: data.companyId,
          },
          { headers },
        ),
      );
    }),
  );

export const unlockTalentProfile = createServerFn({ method: 'POST' })
  .validator((input: { candidateId: string; companyId?: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (h) => {
      const headers = authed(context, h);
      await requireVerifiedBoardUser(headers);
      return asResult(() =>
        getBoard().me.talentAccess.unlock(data, { headers }),
      );
    }),
  );

export const getTalentCandidateAccess = createServerFn({ method: 'GET' })
  .validator((input: { candidateId: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (h) => {
      const headers = authed(context, h);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.talentAccess.retrieveCandidate(data.candidateId, {
        headers,
      });
    }),
  );

export const upgradeTalentAccess = createServerFn({ method: 'POST' })
  .validator((input: { planId: string; companyId?: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (h) => {
      const headers = authed(context, h);
      await requireVerifiedBoardUser(headers);
      return asResult(() =>
        getBoard().me.talentAccess.upgrade(data, { headers }),
      );
    }),
  );

export const openTalentBillingPortal = createServerFn({ method: 'POST' })
  .validator((input: { companySlug: string; returnPath?: string }) => {
    if (input.returnPath) assertRelative(input.returnPath);
    return input;
  })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context, data }) =>
    gatedRead(context, async (h) => {
      const headers = authed(context, h);
      await requireVerifiedBoardUser(headers);
      return asResult(() =>
        getBoard().me.companies.billingPortal.create(
          data.companySlug,
          { returnPath: data.returnPath },
          { headers },
        ),
      );
    }),
  );
