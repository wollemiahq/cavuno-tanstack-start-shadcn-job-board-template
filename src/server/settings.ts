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
import { isBoardApiError } from '@cavuno/board';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import { MARKETING_CONSENT } from '../lib/marketing-consent';
import {
  requireSessionMiddleware,
  type SessionContext,
} from '../lib/session-middleware';
import { persistAuthSession } from './auth';
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
// Granting from here is safe only because the settings row renders this
// app's disclosure copy beside the control (`marketingConsent_*` messages)
// — the API records the decision, never the prose.

export const getMarketingConsent = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) => {
    if (!MARKETING_CONSENT.notificationPreferences) return null;
    return gatedRead(context, () =>
      getBoard().me.marketingConsent.retrieve({
        headers: authedHeaders(context),
      }),
    );
  });

export const setMarketingConsent = createServerFn({ method: 'POST' })
  .validator((input: { granted: boolean }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const consent = getBoard().me.marketingConsent;
    const options = { headers: authedHeaders(context) };
    return data.granted ? consent.grant(options) : consent.withdraw(options);
  });

/** The signed-in board user for /settings (email + hasPassword). */
export const getSettingsAccount = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, () =>
      getBoard().me.retrieve(undefined, {
        headers: authedHeaders(context),
      }),
    ),
  );

function actionError(error: unknown): {
  ok: false;
  code: string;
  message: string;
} {
  if (isBoardApiError(error)) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

export const requestEmailChange = createServerFn({ method: 'POST' })
  .validator((input: { email: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    try {
      await getBoard().me.requestEmailChange(data, {
        headers: authedHeaders(context),
      });
      return { ok: true as const };
    } catch (error) {
      return actionError(error);
    }
  });

/** Set-password for passwordless accounts — existing forgot-password email. */
export const requestSetPassword = createServerFn({ method: 'POST' })
  .validator((input: { email: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data }) => {
    await getBoard().auth.forgotPassword(data);
    return { ok: true as const };
  });

export const updatePassword = createServerFn({ method: 'POST' })
  .validator((input: { currentPassword: string; newPassword: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    try {
      const session = await getBoard().me.updatePassword(data, {
        headers: authedHeaders(context),
      });
      persistAuthSession(session);
      return { ok: true as const };
    } catch (error) {
      return actionError(error);
    }
  });
