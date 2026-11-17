/**
 * `/email-preferences` server functions: the page the board's email footers
 * link to. The link's `token` names the person, so no sign-in; the SDK sends
 * it in a header. Reading changes nothing (mail scanners open links), and
 * every change is a person's click.
 *
 * The link's token goes straight into an httpOnly cookie
 * (src/lib/email-preferences-cookie.ts) under a random key, and the page
 * redirects to itself with only the key (`?person=`), so no page script,
 * analytics tag, referrer or screenshot sees the token. Every read
 * and change below names the person and uses the token kept for them, and
 * all are POSTs, so the token never sits in a URL or an access log.
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
  dropEmailPreferencesEntry,
  findEmailPreferencesPerson,
  findEmailPreferencesToken,
  isEmailPreferencesPerson,
  isEmailPreferencesToken,
  keepEmailPreferencesEntry,
  newEmailPreferencesPerson,
} from '../lib/email-preferences-cookie';
import { requestOrigin } from '../lib/request-origin';

import type { EmailPreferences, EmailPreferencesUpdate } from '@cavuno/board';

/**
 * The page's read: the person's preferences, or why there are none to show.
 */
export type EmailPreferencesRead =
  | EmailPreferences
  | 'invalid_link'
  | 'link_expired';

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

const cookieHeader = () => getRequestHeader('cookie') ?? null;

/** The token kept for `person`: null when the cookie holds none for them. */
function keptToken(person: string | undefined): string | null {
  if (!person || !isEmailPreferencesPerson(person)) return null;
  return findEmailPreferencesToken(cookieHeader(), person);
}

function renew(person: string, token: string) {
  const cookie = keepEmailPreferencesEntry(person, token);
  if (cookie) appendResponseHeader('Set-Cookie', cookie);
}

/**
 * Runs `action` with the token kept for `person`, renewing it. Throws when
 * none is kept; the page then reads again and says to open the email's link.
 */
async function withKeptToken<T>(
  person: string,
  action: (token: string) => Promise<T>,
): Promise<T> {
  const token = keptToken(person);
  if (!token) throw new Error('email_preferences_link_expired');
  const result = await action(token);
  renew(person, token);
  return result;
}

/**
 * Keeps the link's token in a cookie, under the key it returns (the one
 * already holding it, else a new one). Null for a malformed token, which
 * is never kept; any other token is checked on the next read.
 */
export const keepEmailPreferencesToken = createServerFn({ method: 'POST' })
  .validator((input: { token: string }) => input)
  .handler(({ data }): string | null => {
    if (!isEmailPreferencesToken(data.token)) return null;
    const person =
      findEmailPreferencesPerson(cookieHeader(), data.token) ??
      newEmailPreferencesPerson();
    renew(person, data.token);
    return person;
  });

/**
 * What the page shows: the person's preferences; `link_expired` when no
 * token is kept for them (an hour passed, or cookies are blocked); or
 * `invalid_link` when there is no person or the API rejects the token,
 * which also drops it.
 */
export const getEmailPreferences = createServerFn({ method: 'POST' })
  .validator((input: { person?: string }) => input)
  .handler(async ({ data }): Promise<EmailPreferencesRead> => {
    if (!data.person) return 'invalid_link';
    const token = keptToken(data.person);
    if (!token) return 'link_expired';
    try {
      const prefs = await getBoard().emailPreferences.get(token);
      renew(data.person, token);
      return prefs;
    } catch (error) {
      if (
        isBoardApiError(error) &&
        error.code === 'email_preferences_token_invalid'
      ) {
        appendResponseHeader(
          'Set-Cookie',
          dropEmailPreferencesEntry(data.person),
        );
        return 'invalid_link';
      }
      throw error;
    }
  });

export const updateEmailPreferences = createServerFn({ method: 'POST' })
  .validator(
    (input: { person: string; changes: EmailPreferencesUpdate }) => input,
  )
  .handler(({ data }): Promise<EmailPreferences> =>
    withKeptToken(data.person, (token) =>
      getBoard().emailPreferences.update(
        token,
        withConsentPage(
          data.changes,
          getRequest().headers.get('referer'),
          requestOrigin(),
        ),
      ),
    ),
  );

export const unsubscribeAllEmailPreferences = createServerFn({
  method: 'POST',
})
  .validator((input: { person: string }) => input)
  .handler(({ data }): Promise<EmailPreferences> =>
    withKeptToken(data.person, (token) =>
      getBoard().emailPreferences.unsubscribeAll(token),
    ),
  );
