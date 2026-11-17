/**
 * `/email-preferences` server functions: the page the board's email footers
 * link to. The link's `token` names the person, so no sign-in; the SDK sends
 * it in a header. Reading changes nothing (mail scanners open links), and
 * every change is a person's click.
 */
import { isBoardApiError } from '@cavuno/board';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
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

/** The person's preferences, or null when the link's token is not valid. */
export const getEmailPreferences = createServerFn({ method: 'GET' })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }): Promise<EmailPreferences | null> => {
    try {
      return await getBoard().emailPreferences.get(data.token);
    } catch (error) {
      if (
        isBoardApiError(error) &&
        error.code === 'email_preferences_token_invalid'
      ) {
        return null;
      }
      throw error;
    }
  });

export const updateEmailPreferences = createServerFn({ method: 'POST' })
  .validator(
    (input: { token: string; changes: EmailPreferencesUpdate }) => input,
  )
  .handler(async ({ data }): Promise<EmailPreferences> => {
    return getBoard().emailPreferences.update(
      data.token,
      withConsentPage(
        data.changes,
        getRequest().headers.get('referer'),
        requestOrigin(),
      ),
    );
  });

export const unsubscribeAllEmailPreferences = createServerFn({
  method: 'POST',
})
  .validator((input: { token: string }) => input)
  .handler(({ data }): Promise<EmailPreferences> =>
    getBoard().emailPreferences.unsubscribeAll(data.token),
  );
