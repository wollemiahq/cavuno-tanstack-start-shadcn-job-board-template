/**
 * `/products/$productSlug` — a digital product's page. Head meta and the
 * Product JSON-LD come from `getProductPage`; unlisted (link-only) products
 * render with `noindex` and no structured data.
 */
import {
  createFileRoute,
  getRouteApi,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { ShoppingBag } from 'lucide-react';

import { m } from '../paraglide/messages';
import {
  getProductCheckoutState,
  getProductPage,
  getProductReviews,
  resendPurchaseLink,
  startProductCheckout,
} from '../server/products';
import { ProductPageView, type ProductPageDependencies } from './-product-page';

import { EmptyState } from '@/components/empty-state';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageLayout } from '@/components/layout/page-layout';
import { searchString, type UrlSearchInput } from '@/lib/pagination';

export const cavunoPage = 'product';

type ProductSearch = {
  /** Stripe's return: the Checkout Session to confirm. */
  session_id?: string;
  /** Open the buying step at once (the listing's Buy button). */
  buy?: boolean;
};

const dependencies: ProductPageDependencies = {
  startCheckout: startProductCheckout,
  getCheckoutState: getProductCheckoutState,
  resendLink: resendPurchaseLink,
  loadReviews: getProductReviews,
};

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/products/$productSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: (search: UrlSearchInput): ProductSearch => ({
    session_id: searchString(search.session_id),
    buy: search.buy === true || search.buy === 'true' ? true : undefined,
  }),
  loader: ({ params }) =>
    getProductPage({ data: { productSlug: params.productSlug } }),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: ProductPage,
  notFoundComponent: () => (
    <PageLayout>
      <EmptyState
        icon={<ShoppingBag aria-hidden="true" />}
        title={m.product_notFoundTitle()}
        description={m.product_notFoundText()}
      />
    </PageLayout>
  ),
});

function ProductPage() {
  const { product, reviews, canonical } = Route.useLoaderData();
  const { session_id: sessionId, buy } = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();

  return (
    <ProductPageView
      key={product.slug}
      product={product}
      reviews={reviews}
      shareUrl={canonical}
      language={board.language}
      returnPath={pathname}
      sessionId={sessionId ?? null}
      startInCheckout={buy === true}
      dependencies={dependencies}
      onPurchase={(purchaseToken) =>
        void navigate({
          to: '/purchases/$purchaseToken',
          params: { purchaseToken },
          replace: Boolean(sessionId),
        })
      }
    />
  );
}
