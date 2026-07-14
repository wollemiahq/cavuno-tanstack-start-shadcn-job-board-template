/**
 * Settings server functions — email notification preferences.
 *
 * The signed-in get/update pair is auth-enforced via the session
 * middleware and carries the board-access grant (so a password-protected
 * board answers; the read redirects to `/password` if the grant is missing).
 * `unsubscribe` is the email-link branch: the HMAC token in the link IS the
 * authorization and its endpoint is ungated, so it takes no session or grant
 * (mirrors the hosted one-click unsubscribe).
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

import type {
  UnsubscribeBody,
  UpdateNotificationPreferenceBody,
} from '@cavuno/board';

/** Bearer + board-access grant for one gated `/me/*` call. */
function authedHeaders(
  context: SessionContext & BoardAccessContext,
): Record<string, string> {
  return { ...context.authHeaders, ...context.boardAccessHeaders };
}

export const getNotificationPreferences = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, () =>
      getBoard().me.notificationPreferences.retrieve({
        headers: authedHeaders(context),
      }),
    ),
  );

export const updateNotificationPreference = createServerFn({ method: 'POST' })
  .validator((input: UpdateNotificationPreferenceBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    return getBoard().me.notificationPreferences.update(data, {
      headers: authedHeaders(context),
    });
  });

/** Email-link one-click unsubscribe — the token is the authorization. */
export const unsubscribeWithToken = createServerFn({ method: 'POST' })
  .validator((input: UnsubscribeBody) => input)
  .handler(async ({ data }) => {
    await getBoard().me.notificationPreferences.unsubscribeWithToken(data);
    return { ok: true as const };
  });
