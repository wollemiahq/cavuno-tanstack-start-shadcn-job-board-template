/**
 * `/purchases/$purchaseToken` — a purchase's download page (the purchase
 * email links here). Private: `noindex`, never cached, and the token never
 * reaches a cache key outside the Board API call itself.
 */
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Lock } from 'lucide-react';

import { m } from '../paraglide/messages';
import { resendPurchaseLink } from '../server/products';
import {
  confirmPurchaseEmail,
  downloadAllPurchaseFiles,
  downloadPurchaseFile,
  getPurchasePage,
  reviewPurchase,
} from '../server/purchases';
import { purchaseHead } from './-purchase-head';
import {
  PurchaseConfirmView,
  PurchaseReadyView,
  PurchaseUnavailableView,
  type PurchasePageDependencies,
} from './-purchase-page';

import { EmptyState } from '@/components/empty-state';
import { PageLayout } from '@/components/layout/page-layout';

export const cavunoPage = 'purchase';

export const Route = createFileRoute('/purchases/$purchaseToken')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: ({ params }) =>
    getPurchasePage({ data: { purchaseToken: params.purchaseToken } }),
  head: ({ loaderData }) => purchaseHead(loaderData),
  component: PurchasePage,
  notFoundComponent: () => (
    <PageLayout>
      <EmptyState
        icon={<Lock aria-hidden="true" />}
        title={m.purchaseUnavailable_title()}
        description={m.purchaseUnavailable_notFoundText()}
      />
    </PageLayout>
  ),
});

function PurchasePage() {
  const data = Route.useLoaderData();
  const { purchaseToken } = Route.useParams();
  const router = useRouter();
  const dependencies: PurchasePageDependencies = {
    confirmEmail: confirmPurchaseEmail,
    download: downloadPurchaseFile,
    downloadAll: downloadAllPurchaseFiles,
    review: reviewPurchase,
    resend: resendPurchaseLink,
    openUrl: (url) => window.location.assign(url),
    invalidate: () => router.invalidate(),
  };

  if (data.state === 'confirm') {
    return (
      <PurchaseConfirmView
        purchaseToken={purchaseToken}
        dependencies={dependencies}
      />
    );
  }
  if (data.state === 'unavailable') {
    return <PurchaseUnavailableView code={data.code} />;
  }
  return (
    <PurchaseReadyView
      purchase={data.purchase}
      purchaseToken={purchaseToken}
      dependencies={dependencies}
    />
  );
}
