/**
 * `/me/purchases` — the signed-in user's purchased digital products, over
 * `board.purchases.mine()`. Signed out, it sends the visitor to sign in.
 */
import { createFileRoute } from '@tanstack/react-router';

import { PurchasesPageView } from './-me.purchases';
import { createPurchasesLoader, purchasesHead } from './-me.purchases-loader';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';

export const cavunoPage = 'mePurchases';

export const Route = createFileRoute('/me/purchases')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  loader: createPurchasesLoader(),
  head: ({ loaderData }) => purchasesHead(loaderData),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { purchases } = Route.useLoaderData();
  return <PurchasesPageView purchases={purchases} />;
}
