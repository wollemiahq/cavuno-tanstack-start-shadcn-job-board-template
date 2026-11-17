/**
 * `/alerts/manage` loader, head, and server dependencies, kept apart from the
 * page UI so the route file can import them without pulling the page into the
 * shared client entry. The loader only reads: link checkers open every
 * link in an email, so opening one, the Unsubscribe link included, changes
 * nothing.
 */
import { redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import {
  deleteJobAlertPreference,
  getJobAlertManageState,
  keepJobAlertManageLink,
  resubscribeJobAlert,
  unsubscribeJobAlert,
} from '../server/alerts-manage';
import {
  getAlertFilterNames,
  getAnchorJobPaths,
  getSeoBase,
} from '../server/queries';

import {
  resolveAlertFilterNames,
  resolveAnchorJobPaths,
  type AlertFilterNames,
  type AnchorJobPaths,
} from '@/board/job-alert-match';
import { headTitle } from '@/lib/page-title';
import type { JobAlertManageState } from '@cavuno/board';

type AlertManageSeo = { boardName: string };
// `empty`: the token is valid but no alerts remain (the last one was deleted).
export type ManageData =
  | {
      state: JobAlertManageState;
      anchorJobPaths: AnchorJobPaths;
      filterNames: AlertFilterNames;
    }
  | { empty: true }
  | { error: true };
export type LoaderData = ManageData & { seo: AlertManageSeo };
/**
 * `subscription` and `token` come from the email link and leave the address
 * at once; `link` is the key of the cookie that keeps them. `unsubscribe`
 * marks the email's Unsubscribe link: the page offers that as a button.
 */
export type ManageSearch = {
  subscription?: string;
  token?: string;
  link?: string;
  unsubscribe?: true;
};

export type AlertManageDependencies = {
  deleteJobAlertPreference: (options: {
    data: { link: string; preferenceId: string; token: string };
  }) => ReturnType<typeof deleteJobAlertPreference>;
  getJobAlertManageState: (options: {
    data: { link: string };
  }) => Promise<JobAlertManageState | null | 'link_expired'>;
  keepJobAlertManageLink: (options: {
    data: { subscription: string; token: string };
  }) => Promise<string | null>;
  getAnchorJobPaths: (options: {
    data: { jobSlugs: string[] };
  }) => Promise<AnchorJobPaths>;
  getAlertFilterNames: (options: {
    data: { categorySlugs: string[]; placeIds: string[] };
  }) => Promise<AlertFilterNames>;
  getSeoBase: () => Promise<AlertManageSeo>;
  resubscribeJobAlert: (options: {
    data: { link: string };
  }) => ReturnType<typeof resubscribeJobAlert>;
  unsubscribeJobAlert: (options: {
    data: { link: string };
  }) => ReturnType<typeof unsubscribeJobAlert>;
};

export const alertManageDependencies: AlertManageDependencies = {
  deleteJobAlertPreference,
  getAlertFilterNames,
  getJobAlertManageState,
  getAnchorJobPaths,
  getSeoBase,
  keepJobAlertManageLink,
  resubscribeJobAlert,
  unsubscribeJobAlert,
};

export function createAlertManageLoader(
  dependencies: AlertManageDependencies = alertManageDependencies,
) {
  return async ({ deps }: { deps: ManageSearch }): Promise<LoaderData> => {
    // The link's subscription and token go into a cookie, and the page
    // opens again with only its key, before any script on it runs. A
    // malformed link is not kept, so the page opens with no key: invalid.
    if (deps.subscription && deps.token) {
      const link = await dependencies.keepJobAlertManageLink({
        data: { subscription: deps.subscription, token: deps.token },
      });
      const search: ManageSearch = {};
      if (link) search.link = link;
      if (deps.unsubscribe) search.unsubscribe = true;
      throw redirect({ to: '/alerts/manage', search, replace: true });
    }
    // Started before the branch so it overlaps the manage-state read.
    const seoPromise = dependencies.getSeoBase();
    if (!deps.link) return { error: true, seo: await seoPromise };
    try {
      const [state, seo] = await Promise.all([
        dependencies.getJobAlertManageState({ data: { link: deps.link } }),
        seoPromise,
      ]);
      // Nothing kept under the key (an hour passed, or cookies are
      // blocked): the notice says to use the link from a recent email.
      if (state === 'link_expired') return { error: true, seo };
      if (!state) return { empty: true, seo };
      const [anchorJobPaths, filterNames] = await Promise.all([
        resolveAnchorJobPaths(
          state.preferences,
          dependencies.getAnchorJobPaths,
        ),
        resolveAlertFilterNames(
          state.preferences,
          dependencies.getAlertFilterNames,
        ),
      ]);
      return { state, anchorJobPaths, filterNames, seo };
    } catch {
      return { error: true, seo: await seoPromise };
    }
  };
}

export function alertManageHead(loaderData: LoaderData | undefined) {
  return {
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.alertsManage_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  };
}
