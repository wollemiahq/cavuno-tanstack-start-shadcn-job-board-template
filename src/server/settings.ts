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
  MARKETING_CONSENT,
  type MarketingConsentState,
} from '../lib/marketing-consent';
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

// ─── Marketing consent ──────────────────────────────────────────────────────
//
// Raw-client calls because this template pins an SDK release predating
// `board.me.marketingConsent` — swap to that namespace on the next bump.
// Granting from here is safe only because the settings row renders this
// app's disclosure copy beside the control (`marketingConsent_*` messages).

export const getMarketingConsent = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) => {
    if (!MARKETING_CONSENT.notificationPreferences) return null;
    return gatedRead(context, () =>
      getBoard().client.fetch<MarketingConsentState | null>(
        '/me/marketing-consent',
        { headers: authedHeaders(context) },
      ),
    );
  });

export const setMarketingConsent = createServerFn({ method: 'POST' })
  .validator((input: { granted: boolean }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    return getBoard().client.fetch<MarketingConsentState>(
      `/me/marketing-consent/${data.granted ? 'grant' : 'withdraw'}`,
      { method: 'POST', headers: authedHeaders(context) },
    );
  });
