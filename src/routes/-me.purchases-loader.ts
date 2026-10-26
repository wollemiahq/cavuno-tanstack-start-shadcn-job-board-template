/**
 * `/me/purchases` loader and head, kept apart from the page UI so the route
 * file can import them without pulling the page into the shared shell.
 */
import { isRedirect, redirect } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getMyPurchases } from '../server/purchases';
import { getSeoBase } from '../server/queries';

import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';
import type { PurchaseSummaryListEnvelope } from '@cavuno/board';

export type PurchasesLoaderDependencies = {
  getMyPurchases: () => Promise<PurchaseSummaryListEnvelope>;
  getSeoBase: () => Promise<{ boardName: string }>;
};

const purchasesLoaderDependencies: PurchasesLoaderDependencies = {
  getMyPurchases,
  getSeoBase,
};

export function createPurchasesLoader(
  dependencies: PurchasesLoaderDependencies = purchasesLoaderDependencies,
) {
  return async () => {
    try {
      const [purchases, seo] = await Promise.all([
        dependencies.getMyPurchases(),
        dependencies.getSeoBase(),
      ]);
      return { purchases, seo };
    } catch (error) {
      if (isRedirect(error)) throw error;
      if (candidateLoaderError(error) === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: '/me/purchases' },
        });
      }
      throw error;
    }
  };
}

export function purchasesHead(
  loaderData: { seo: { boardName: string } } | undefined,
) {
  return {
    meta: [
      { title: headTitle(loaderData?.seo.boardName, m.mePurchases_title()) },
      { name: 'robots', content: 'noindex' },
    ],
  };
}
