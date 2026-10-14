/**
 * `/me/applications` loader, head, and server dependencies, kept apart from the
 * page UI so the route file can import them without pulling the page into the
 * shared client entry.
 */
import { isRedirect, notFound, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getApplications, withdrawApplication } from '../server/applications';
import { getBoardContext, getSeoBase } from '../server/queries';

import {
  incomingAuthSearch,
  mergeAuthConversionSearch,
} from '@/lib/board-datalayer-events';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';
import type { Application, ApplicationsListQuery } from '@cavuno/board';

export type ApplicationsRouteDependencies = {
  getApplications: (options: {
    data: ApplicationsListQuery | undefined;
  }) => Promise<{ data: Application[] }>;
  getBoardContext: () => Promise<{
    features: { nativeApplications: boolean };
  }>;
  getSeoBase: () => Promise<{ boardName: string }>;
  withdrawApplication: (options: {
    data: { id: string };
  }) => ReturnType<typeof withdrawApplication>;
};

export const applicationsRouteDependencies: ApplicationsRouteDependencies = {
  getApplications,
  getBoardContext,
  getSeoBase,
  withdrawApplication,
};

export function createApplicationsLoader(
  dependencies: ApplicationsRouteDependencies = applicationsRouteDependencies,
) {
  return async (context?: {
    location?: { href?: string; searchStr?: string; search?: unknown };
  }) => {
    // External-apply-only board (nativeApplications off): there is no
    // applications surface — the platform 422s the read. Treat it as
    // not-existing (404) rather than rendering an error state.
    const board = await dependencies.getBoardContext();
    if (!board.features.nativeApplications) throw notFound();
    try {
      const [applications, seo] = await Promise.all([
        dependencies.getApplications({ data: undefined }),
        dependencies.getSeoBase(),
      ]);
      return { ...applications, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: mergeAuthConversionSearch(
            { returnTo: '/me/applications' },
            incomingAuthSearch(context?.location),
          ),
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: '/me/applications' },
        });
      }
      throw error;
    }
  };
}

export function applicationsHead(
  loaderData: { seo: { boardName: string } } | undefined,
) {
  return {
    meta: [
      {
        title: headTitle(loaderData?.seo.boardName, m.meApplications_title()),
      },
      { name: 'robots', content: 'noindex' },
    ],
  };
}
