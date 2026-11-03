/**
 * Profile item verification server functions: ask the board team to check an
 * item, confirm a work or school email by code, and consume the emailed link.
 * Auth is enforced per function by the session middleware, like every other
 * `/me/*` write. The email-domain endpoints have no `@cavuno/board` method
 * yet, so they go through the SDK's typed `client.fetch`.
 */
import { createServerFn } from '@tanstack/react-start';

import { finishAuthFlow, resolveAuthFlowToken } from '../lib/auth-flow.server';
import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import {
  requireSessionMiddleware,
  type SessionContext,
} from '../lib/session-middleware';
import { run } from './employers';
import { requireVerifiedBoardUser } from './me-verification';

import type { ItemVerification } from '@cavuno/board';

/** `POST /me/profile/verifications/email-domain`: the check that was sent. */
export type ItemEmailDomainCheck = {
  object: 'item_email_domain_verification';
  itemKey: string;
  emailDomain: string;
  /** False when an email for this item went out under a minute ago. */
  sent: boolean;
  retryAfterSeconds: number;
  codeExpiresAt: string;
  linkExpiresAt: string;
};

function authedHeaders(context: SessionContext & BoardAccessContext) {
  return { ...context.authHeaders, ...context.boardAccessHeaders };
}

/** Ask the board team to check one of my profile items. */
export const submitProfileItemVerification = createServerFn({
  method: 'POST',
})
  .validator((input: { itemKey: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return run(() =>
      getBoard().me.profile.submitVerification(
        { itemKey: data.itemKey },
        { headers },
      ),
    );
  });

/** Email a code and a link to an address at the item's domain. */
export const startProfileItemEmailCheck = createServerFn({ method: 'POST' })
  .validator((input: { itemKey: string; email: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return run(() =>
      getBoard().client.fetch<ItemEmailDomainCheck>(
        '/me/profile/verifications/email-domain',
        {
          method: 'POST',
          body: { itemKey: data.itemKey, email: data.email },
          headers,
        },
      ),
    );
  });

/** Verify the item with the 6-digit code from the email. */
export const confirmProfileItemEmailCode = createServerFn({ method: 'POST' })
  .validator((input: { itemKey: string; code: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return run(() =>
      getBoard().client.fetch<ItemVerification>(
        '/me/profile/verifications/email-domain/confirm',
        {
          method: 'POST',
          body: { itemKey: data.itemKey, code: data.code },
          headers,
        },
      ),
    );
  });

/**
 * Consume the emailed link. The single-use token is the authorization, so
 * no session is needed; it arrives in the httpOnly flow cookie the request
 * handler moved it into, never the URL.
 */
export const confirmItemEmailLink = createServerFn({ method: 'POST' })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const result = await run(async () =>
      getBoard().client.fetch<ItemVerification>('/auth/verify-item-email', {
        method: 'POST',
        body: { token: resolveAuthFlowToken('verify-item-email', data.token) },
      }),
    );
    if (result.ok) finishAuthFlow('verify-item-email');
    return result;
  });

/** Ask the board team to check one of a company's profile items. */
export const submitCompanyItemVerification = createServerFn({
  method: 'POST',
})
  .validator((input: { slug: string; itemKey: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    return run(() =>
      getBoard().me.companies.submitVerification(
        data.slug,
        { itemKey: data.itemKey },
        { headers },
      ),
    );
  });
