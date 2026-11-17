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
  type EmailPreferencesRead,
} from '../server/email-preferences';
import { getSeoBase } from '../server/queries';

import { headTitle } from '@/lib/page-title';
import type { EmailPreferences, EmailPreferencesUpdate } from '@cavuno/board';

type Seo = { boardName: string };
/** `person` names whose token the server keeps; see the server functions. */
export type EmailPreferencesData = {
  prefs: EmailPreferencesRead;
  person: string | undefined;
  seo: Seo;
};
export type EmailPreferencesSearch = { token?: string; person?: string };

/** The reads and changes name the person whose token the server keeps. */
export type EmailPreferencesDependencies = {
  keepEmailPreferencesToken: (options: {
    data: { token: string };
  }) => Promise<string | null>;
  getEmailPreferences: (options: {
    data: { person?: string };
  }) => Promise<EmailPreferencesRead>;
  getSeoBase: () => Promise<Seo>;
  updateEmailPreferences: (options: {
    data: { person: string; changes: EmailPreferencesUpdate };
  }) => Promise<EmailPreferences>;
  unsubscribeAllEmailPreferences: (options: {
    data: { person: string };
  }) => Promise<EmailPreferences>;
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
    // The link's token goes into a cookie, and the page opens again with
    // only its key, before any script on it runs. A malformed token is not
    // kept, so the page opens with no person: the invalid-link notice.
    if (deps.token) {
      const person = await dependencies.keepEmailPreferencesToken({
        data: { token: deps.token },
      });
      throw redirect({
        to: '/email-preferences',
        search: person ? { person } : {},
        replace: true,
      });
    }
    const [prefs, seo] = await Promise.all([
      dependencies.getEmailPreferences({ data: { person: deps.person } }),
      dependencies.getSeoBase(),
    ]);
    return { prefs, person: deps.person, seo };
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
