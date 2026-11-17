/**
 * `/email-preferences` loader, head, and server dependencies, kept apart
 * from the page UI so the route file can import them without pulling the
 * page into the shared client entry. The loader only reads: mail scanners
 * open the footer link before people do.
 */
import { m } from '../paraglide/messages';
import {
  getEmailPreferences,
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

export type EmailPreferencesDependencies = {
  getEmailPreferences: (options: {
    data: { token: string };
  }) => Promise<EmailPreferences | null>;
  getSeoBase: () => Promise<Seo>;
  updateEmailPreferences: (options: {
    data: { token: string; changes: EmailPreferencesUpdate };
  }) => Promise<EmailPreferences>;
  unsubscribeAllEmailPreferences: (options: {
    data: { token: string };
  }) => Promise<EmailPreferences>;
};

export const emailPreferencesDependencies: EmailPreferencesDependencies = {
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
    const [prefs, seo] = await Promise.all([
      deps.token
        ? dependencies.getEmailPreferences({ data: { token: deps.token } })
        : null,
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
