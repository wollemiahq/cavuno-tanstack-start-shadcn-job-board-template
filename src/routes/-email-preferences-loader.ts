/**
 * `/email-preferences` loader and head, kept apart from the page UI so the
 * route file can import them without pulling the page into the shared
 * client entry. The loader only reads: mail scanners open the footer link
 * before people do.
 */
import { m } from '../paraglide/messages';
import { getEmailPreferences } from '../server/email-preferences';
import { getSeoBase } from '../server/queries';

import { headTitle } from '@/lib/page-title';
import type { EmailPreferences } from '@cavuno/board';

type Seo = { boardName: string };
/** `prefs` is null when the link's token is missing or not valid. */
export type EmailPreferencesData = {
  prefs: EmailPreferences | null;
  seo: Seo;
};
export type EmailPreferencesSearch = { token?: string };

export type EmailPreferencesLoaderDependencies = {
  getEmailPreferences: (options: {
    data: { token: string };
  }) => Promise<EmailPreferences | null>;
  getSeoBase: () => Promise<Seo>;
};

export function createEmailPreferencesLoader(
  dependencies: EmailPreferencesLoaderDependencies = {
    getEmailPreferences,
    getSeoBase,
  },
) {
  return async ({
    deps,
  }: {
    deps: EmailPreferencesSearch;
  }): Promise<EmailPreferencesData> => {
    const seoPromise = dependencies.getSeoBase();
    const prefs = deps.token
      ? await dependencies.getEmailPreferences({ data: { token: deps.token } })
      : null;
    return { prefs, seo: await seoPromise };
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
