/**
 * Settings server functions — email notification preferences.
 *
 * The signed-in get/update pair is auth-enforced via the session
 * middleware and carries the board-access grant (so a password-protected
 * board answers; the read redirects to `/password` if the grant is missing).
 * The email-link unsubscribe is the other branch: the HMAC token in the
 * link IS the authorization and its endpoint is ungated, so it takes no
 * session or grant.
 */
import { isBoardApiError } from '@cavuno/board';
import { createServerFn } from '@tanstack/react-start';

import { readMcpServerFlag } from '../board/board-feature-flags';
import { getBoard } from '../lib/board';
import {
  boardAccessMiddleware,
  type BoardAccessContext,
} from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { persistAuthSession } from '../lib/data-source.server';
import { EMAIL_LINK_PREFIXES } from '../lib/email-link-cookies';
import { MARKETING_CONSENT } from '../lib/marketing-consent';
import {
  requireSessionMiddleware,
  type SessionContext,
} from '../lib/session-middleware';
import { gatedRead } from './board-access';
import { dottedCodec, emailLink } from './email-link';
import { requireVerifiedBoardUser } from './me-verification';

import type {
  Assistant,
  UnsubscribeBody,
  UpdateNotificationPreferenceBody,
} from '@cavuno/board';

export type StarterNotificationChannel =
  | UpdateNotificationPreferenceBody['channel']
  | 'recommendedJobEmails';

export interface StarterUpdateNotificationPreferenceBody {
  channel: StarterNotificationChannel;
  subscribed: boolean;
}

export interface StarterUnsubscribeBody extends Omit<
  UnsubscribeBody,
  'channel'
> {
  channel: StarterNotificationChannel;
}

/** Bearer + board-access grant for one gated `/me/*` call. */
function authedHeaders(context: SessionContext & BoardAccessContext) {
  return { ...context.authHeaders, ...context.boardAccessHeaders };
}

export const getNotificationPreferences = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async () => {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.notificationPreferences.retrieve({ headers });
    }),
  );

export const updateNotificationPreference = createServerFn({ method: 'POST' })
  .validator((input: StarterUpdateNotificationPreferenceBody) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    // Runtime API support lands with this starter change. Keep the narrow cast
    // only at the installed 4.6 SDK boundary until the next SDK release.
    const headers = authedHeaders(context);
    await requireVerifiedBoardUser(headers);
    // SAFETY: StarterUpdateNotificationPreferenceBody is the SDK body with the
    // channel narrowed to the starter-supported notification channels.
    return getBoard().me.notificationPreferences.update(
      data as UpdateNotificationPreferenceBody,
      { headers },
    );
  });

// ─── Email-link unsubscribe ─────────────────────────────────────────────────
//
// A message or job match email's Unsubscribe link carries the board user,
// the channel and an HMAC token for that pair. The page keeps the three in
// an httpOnly cookie (src/lib/email-link-cookies.ts) and drops them from the
// address, which then carries only the cookie's key (`?link=`). Opening the
// link changes nothing, because link checkers open every link in a message:
// the unsubscribe is the person's click on the page's button.

const CHANNELS: readonly StarterNotificationChannel[] = [
  'messageEmails',
  'applicationEmails',
  'recommendedJobEmails',
];

function asChannel(value: string): StarterNotificationChannel | null {
  return CHANNELS.find((channel) => channel === value) ?? null;
}

const unsubscribeLink = emailLink<StarterUnsubscribeBody>(
  EMAIL_LINK_PREFIXES.settingsUnsubscribe,
  dottedCodec(
    ({ boardUserId, channel, token }) => [boardUserId, channel, token],
    ([boardUserId, channel, token]) => {
      const known = asChannel(channel);
      return known ? { boardUserId, channel: known, token } : null;
    },
    3,
  ),
);

/**
 * Keeps the link's board user, channel and token in a cookie, under the
 * key it returns. Null when any is malformed, which is never kept.
 */
export const keepUnsubscribeLink = createServerFn({ method: 'POST' })
  .validator((input: StarterUnsubscribeBody) => input)
  .handler(({ data }): string | null =>
    asChannel(data.channel) ? unsubscribeLink.keep(data) : null,
  );

/** The channel the link kept under `link` unsubscribes from, or null. */
export const getUnsubscribeLinkChannel = createServerFn({ method: 'POST' })
  .validator((input: { link: string }) => input)
  .handler(({ data }): StarterNotificationChannel | null => {
    const kept = unsubscribeLink.find(data.link);
    if (kept) unsubscribeLink.renew(data.link);
    return kept?.channel ?? null;
  });

/** The person's click: unsubscribes with the link kept under `link`. */
export const unsubscribeWithLink = createServerFn({ method: 'POST' })
  .validator((input: { link: string }) => input)
  .handler(async ({ data }) => {
    await unsubscribeLink.withValue(data.link, (kept) =>
      // SAFETY: StarterUnsubscribeBody is the SDK body with the channel
      // narrowed to the starter-supported notification channels.
      getBoard().me.notificationPreferences.unsubscribeWithToken(
        kept as UnsubscribeBody,
      ),
    );
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
    return gatedRead(context, async () => {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      return getBoard().me.marketingConsent.retrieve({ headers });
    });
  });

export const setMarketingConsent = createServerFn({ method: 'POST' })
  .validator((input: { granted: boolean }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    const consent = getBoard().me.marketingConsent;
    const options = { headers: authedHeaders(context) };
    await requireVerifiedBoardUser(options.headers);
    return data.granted ? consent.grant(options) : consent.withdraw(options);
  });

/** The signed-in board user for /settings (email, hasPassword, role). */
export const getSettingsAccount = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, () => requireVerifiedBoardUser(authedHeaders(context))),
  );

type SettingsActionError = {
  ok: false;
  code: string;
  message: string;
};

function actionError<T>(error: T): SettingsActionError {
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
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      await getBoard().me.requestEmailChange(data, {
        headers,
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
  .handler(async ({ data, context }) => {
    await requireVerifiedBoardUser(authedHeaders(context));
    await getBoard().auth.forgotPassword(data);
    return { ok: true as const };
  });

export const updatePassword = createServerFn({ method: 'POST' })
  .validator((input: { currentPassword: string; newPassword: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    try {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      const session = await getBoard().me.updatePassword(data, {
        headers,
      });
      persistAuthSession(session);
      return { ok: true as const };
    } catch (error) {
      return actionError(error);
    }
  });

// ─── Connected assistants ───────────────────────────────────────────────────
//
// The AI assistants (Claude, ChatGPT…) the person allowed to use their
// account through the board's MCP server (`board.me.assistants`).

/**
 * The person's connected assistants, newest first (up to 50). Empty, with
 * no call, while the board doesn't serve its MCP server (`features.mcp`).
 */
export const getConnectedAssistants = createServerFn({ method: 'GET' })
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(({ context }) =>
    gatedRead(context, async (): Promise<Assistant[]> => {
      const { features } = await readBoardContext();
      if (!readMcpServerFlag(features)) return [];
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      const list = await getBoard().me.assistants.list(undefined, {
        headers,
      });
      return list.data;
    }),
  );

/**
 * Disconnects one assistant. `assistant_not_found` (unknown, someone
 * else's, or already disconnected) comes back as an error for the card to
 * treat as already gone.
 */
export const disconnectAssistant = createServerFn({ method: 'POST' })
  .validator((input: { assistantId: string }) => input)
  .middleware([requireSessionMiddleware, boardAccessMiddleware])
  .handler(async ({ data, context }) => {
    try {
      const headers = authedHeaders(context);
      await requireVerifiedBoardUser(headers);
      await getBoard().me.assistants.revoke(data.assistantId, undefined, {
        headers,
      });
      return { ok: true as const };
    } catch (error) {
      return actionError(error);
    }
  });
