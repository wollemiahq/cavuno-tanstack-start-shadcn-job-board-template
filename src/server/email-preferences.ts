/**
 * `/email-preferences` server functions: the page the board's email footers
 * link to. The link's `token` names the person, so no sign-in; the SDK sends
 * it in a header. Reading changes nothing (mail scanners open links), and
 * every change is a person's click.
 *
 * The link's token goes straight into an httpOnly cookie
 * (src/lib/email-preferences-cookie.ts) and the page redirects to itself
 * without it, so no page script, analytics tag, referrer or screenshot sees
 * it. Every read and change below uses the cookie's token, and all are
 * POSTs, so the token never sits in a URL or an access log.
 */
import { isBoardApiError } from '@cavuno/board';
import { createServerFn } from '@tanstack/react-start';
import {
  appendResponseHeader,
  getRequest,
  getRequestHeader,
} from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import {
  clearEmailPreferencesCookie,
  readEmailPreferencesCookie,
  serializeEmailPreferencesCookie,
} from '../lib/email-preferences-cookie';
import { requestOrigin } from '../lib/request-origin';

import type { EmailPreferences, EmailPreferencesUpdate } from '@cavuno/board';

/**
 * The changes with the page they were made on, for consent evidence: only
 * when they carry consent wording, only a page on this site, and without the
 * link's `token`. A `pageUrl` the browser sent is never kept.
 */
export function withConsentPage(
  changes: EmailPreferencesUpdate,
  referer: string | null,
  origin: string,
): EmailPreferencesUpdate {
  const { pageUrl: _sent, ...rest } = changes;
  if (rest.consentText === undefined || !referer || !URL.canParse(referer)) {
    return rest;
  }
  const url = new URL(referer);
  if (url.origin !== origin) return rest;
  url.searchParams.delete('token');
  return { ...rest, pageUrl: url.toString() };
}

/** The token the cookie keeps; null when there is none. */
function cookieToken(): string | null {
  return readEmailPreferencesCookie(getRequestHeader('cookie') ?? null);
}

function requireCookieToken(): string {
  const token = cookieToken();
  if (!token) throw new Error('email_preferences_token_missing');
  return token;
}

/** Keeps the link's token in the cookie. It is checked on the next read. */
export const keepEmailPreferencesToken = createServerFn({ method: 'POST' })
  .validator((input: { token: string }) => input)
  .handler(({ data }) => {
    const cookie = serializeEmailPreferencesCookie(data.token);
    appendResponseHeader('Set-Cookie', cookie ?? clearEmailPreferencesCookie());
  });

/**
 * The person's preferences, or null when there is no token or it is not
 * valid. A valid token's cookie is renewed; an invalid one is cleared.
 */
export const getEmailPreferences = createServerFn({ method: 'POST' }).handler(
  async (): Promise<EmailPreferences | null> => {
    const token = cookieToken();
    if (!token) return null;
    try {
      const prefs = await getBoard().emailPreferences.get(token);
      const cookie = serializeEmailPreferencesCookie(token);
      if (cookie) appendResponseHeader('Set-Cookie', cookie);
      return prefs;
    } catch (error) {
      if (
        isBoardApiError(error) &&
        error.code === 'email_preferences_token_invalid'
      ) {
        appendResponseHeader('Set-Cookie', clearEmailPreferencesCookie());
        return null;
      }
      throw error;
    }
  },
);

export const updateEmailPreferences = createServerFn({ method: 'POST' })
  .validator((input: { changes: EmailPreferencesUpdate }) => input)
  .handler(async ({ data }): Promise<EmailPreferences> => {
    return getBoard().emailPreferences.update(
      requireCookieToken(),
      withConsentPage(
        data.changes,
        getRequest().headers.get('referer'),
        requestOrigin(),
      ),
    );
  });

export const unsubscribeAllEmailPreferences = createServerFn({
  method: 'POST',
}).handler(
  (): Promise<EmailPreferences> =>
    getBoard().emailPreferences.unsubscribeAll(requireCookieToken()),
);
