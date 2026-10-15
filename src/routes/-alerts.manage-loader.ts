/**
 * `/alerts/manage` loader, head, and server dependencies, kept apart from the
 * page UI so the route file can import them without pulling the page into the
 * shared client entry.
 */
import { m } from '../paraglide/messages';
import {
  getAnchorJobPaths,
  getSeoBase,
  deleteJobAlertPreference,
  getJobAlertManageState,
  resubscribeJobAlert,
  unsubscribeJobAlert,
} from '../server/queries';

import { anchorJobSlugs, type AnchorJobPaths } from '@/board/job-alert-match';
import { headTitle } from '@/lib/page-title';
import type {
  JobAlertDeletePreferenceInput,
  JobAlertManageQuery,
  JobAlertManageState,
  JobAlertManageTokenInput,
} from '@cavuno/board';

type AlertManageSeo = { boardName: string };
// `empty`: the token is valid but no alerts remain (the last one was deleted).
export type ManageData =
  | { state: JobAlertManageState; anchorJobPaths: AnchorJobPaths }
  | { empty: true }
  | { error: true };
export type LoaderData = ManageData & { seo: AlertManageSeo };
export type ManageSearch = {
  subscription?: string;
  token?: string;
  unsubscribe?: true;
};

export type AlertManageDependencies = {
  deleteJobAlertPreference: (options: {
    data: JobAlertDeletePreferenceInput;
  }) => ReturnType<typeof deleteJobAlertPreference>;
  getJobAlertManageState: (options: {
    data: JobAlertManageQuery;
  }) => Promise<JobAlertManageState | null>;
  getAnchorJobPaths: (options: {
    data: { jobSlugs: string[] };
  }) => Promise<AnchorJobPaths>;
  getSeoBase: () => Promise<AlertManageSeo>;
  resubscribeJobAlert: (options: {
    data: JobAlertManageTokenInput;
  }) => ReturnType<typeof resubscribeJobAlert>;
  unsubscribeJobAlert: (options: {
    data: JobAlertManageTokenInput;
  }) => ReturnType<typeof unsubscribeJobAlert>;
};

export const alertManageDependencies: AlertManageDependencies = {
  deleteJobAlertPreference,
  getJobAlertManageState,
  getAnchorJobPaths,
  getSeoBase,
  resubscribeJobAlert,
  unsubscribeJobAlert,
};

export function createAlertManageLoader(
  dependencies: AlertManageDependencies = alertManageDependencies,
) {
  return async ({
    deps,
  }: {
    deps: Pick<ManageSearch, 'subscription' | 'token'>;
  }): Promise<LoaderData> => {
    // Started before the branch so it overlaps the manage-state read.
    const seoPromise = dependencies.getSeoBase();
    if (!deps.subscription || !deps.token) {
      return { error: true, seo: await seoPromise };
    }
    try {
      const [state, seo] = await Promise.all([
        dependencies.getJobAlertManageState({
          data: { subscription: deps.subscription, token: deps.token },
        }),
        seoPromise,
      ]);
      if (!state) return { empty: true, seo };
      // Links for similar-job alerts' anchor jobs. Display only: without
      // them the job title shows unlinked.
      const jobSlugs = anchorJobSlugs(state.preferences);
      const anchorJobPaths = jobSlugs.length
        ? await dependencies
            .getAnchorJobPaths({ data: { jobSlugs } })
            .catch(() => ({}))
        : {};
      return { state, anchorJobPaths, seo };
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
