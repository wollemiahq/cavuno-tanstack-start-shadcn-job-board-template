/**
 * `/email-preferences` loader, head, and server dependencies, kept apart
 * from the page UI so the route file can import them without pulling the
 * page into the shared client entry. The loader only reads: mail scanners
 * open the footer link before people do.
 */
import { redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  getEmailPreferences,
  keepEmailPreferencesToken,
  unsubscribeAllEmailPreferences,
  updateEmailPreferences,
} from '../server/email-preferences';
import { getSeoBase } from '../server/queries';

import { headTitle } from '@/lib/page-title';
import type { EmailPreferences, EmailPreferencesUpdate } from '@cavuno/board';

type Seo = { boardName: string };
/** `prefs` is null when the link's token is missing or not valid. */
export type EmailPreferencesData = {
  prefs: EmailPreferences | null;
  seo: Seo;
};
export type EmailPreferencesSearch = { token?: string };

/** The reads and changes use the token the server keeps in its cookie. */
export type EmailPreferencesDependencies = {
  keepEmailPreferencesToken: (options: {
    data: { token: string };
  }) => Promise<void>;
  getEmailPreferences: () => Promise<EmailPreferences | null>;
  getSeoBase: () => Promise<Seo>;
  updateEmailPreferences: (options: {
    data: { changes: EmailPreferencesUpdate };
  }) => Promise<EmailPreferences>;
  unsubscribeAllEmailPreferences: () => Promise<EmailPreferences>;
};

export const emailPreferencesDependencies: EmailPreferencesDependencies = {
  keepEmailPreferencesToken,
  getEmailPreferences,
  getSeoBase,
  updateEmailPreferences,
  unsubscribeAllEmailPreferences,
};

export function createEmailPreferencesLoader(
  dependencies: EmailPreferencesDependencies = emailPreferencesDependencies,
) {
  return async ({
    deps,
  }: {
    deps: EmailPreferencesSearch;
  }): Promise<EmailPreferencesData> => {
    // The link's token goes into the cookie, and the page opens again
    // without it, before any script on it runs.
    if (deps.token) {
      await dependencies.keepEmailPreferencesToken({
        data: { token: deps.token },
      });
      throw redirect({ to: '/email-preferences', search: {}, replace: true });
    }
    const [prefs, seo] = await Promise.all([
      dependencies.getEmailPreferences(),
      dependencies.getSeoBase(),
    ]);
    return { prefs, seo };
  };
}

export function emailPreferencesHead(
  loaderData: EmailPreferencesData | undefined,
) {
  return {
    meta: [
      {
        title: headTitle(loaderData?.seo.boardName, m.emailPreferences_title()),
      },
      { name: 'robots', content: 'noindex' },
    ],
  };
}
