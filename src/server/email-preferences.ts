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

import type { EmailPreferences, EmailPreferencesUpdate } from '@cavuno/board';

/** The page the request came from, without its token, for consent evidence. */
function pageUrlWithoutToken(): string | undefined {
  const referer = getRequest().headers.get('referer');
  if (!referer || !URL.canParse(referer)) return undefined;
  const url = new URL(referer);
  url.searchParams.delete('token');
  return url.toString();
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
    const changes: EmailPreferencesUpdate = { ...data.changes };
    // Consent evidence records the page it was given on.
    if (changes.consentText !== undefined) {
      const pageUrl = pageUrlWithoutToken();
      if (pageUrl !== undefined) changes.pageUrl = pageUrl;
    }
    return getBoard().emailPreferences.update(data.token, changes);
  });

export const unsubscribeAllEmailPreferences = createServerFn({
  method: 'POST',
})
  .validator((input: { token: string }) => input)
  .handler(({ data }): Promise<EmailPreferences> =>
    getBoard().emailPreferences.unsubscribeAll(data.token),
  );
