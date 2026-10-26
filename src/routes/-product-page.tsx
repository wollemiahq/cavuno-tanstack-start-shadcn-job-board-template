/**
 * `/products/$productSlug` — the product page, in the job page's anatomy:
 * a tinted header band, the gallery and description on the left, a rail
 * with the price card and the facts box on the right, reviews under the
 * description. On a phone the price card sits above the description and a
 * sticky buy bar stays at the bottom.
 *
 * Buying: the price card turns into a short step (email, amount, questions).
 * A free claim goes straight to the download page; a paid product mounts the
 * embedded Stripe Checkout in place of the page, Stripe returns the buyer
 * here with `session_id`, and the page polls until the payment lands.
 */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import { formatDate } from '@cavuno/board/format';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Clock, ShoppingBag } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import { fileTypeLabels } from '@/board/product-view-model';
import { CopyLinkButton } from '@/components/board/copy-link-button';
import type {
  ProductCheckoutRefusal,
  ProductCheckoutValues,
} from '@/components/board/product-checkout-form';
import {
  ProductCover,
  RatingSummary,
  ReviewStars,
  productPriceText,
} from '@/components/board/product-ui';
import {
  PurchaseResendDialog,
  type ResendLinkAction,
} from '@/components/board/purchase-resend-dialog';
import { EmptyState } from '@/components/empty-state';
import { Container } from '@/components/layout/container';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { PageLayout } from '@/components/layout/page-layout';
import { useRootSession } from '@/components/root-session';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type {
  Product,
  ProductCheckout,
  ProductCheckoutStatus,
  ProductReview,
  ProductReviewListEnvelope,
} from '@cavuno/board';

// Loaded when the buyer starts buying: the product page itself stays light.
const ProductCheckoutForm = lazy(() =>
  import('@/components/board/product-checkout-form').then((module) => ({
    default: module.ProductCheckoutForm,
  })),
);
const EmbeddedCheckout = lazy(() =>
  import('@/components/paywall/embedded-checkout').then((module) => ({
    default: module.EmbeddedCheckout,
  })),
);

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string | null; message: string };

export type ProductPageDependencies = {
  startCheckout: (input: {
    data: ProductCheckoutValues & { productSlug: string; returnPath: string };
  }) => Promise<ActionResult<ProductCheckout>>;
  getCheckoutState: (input: {
    data: { productSlug: string; sessionId: string };
  }) => Promise<ActionResult<ProductCheckoutStatus>>;
  resendLink: ResendLinkAction;
  loadReviews: (input: {
    data: { productSlug: string; cursor?: string };
  }) => Promise<ProductReviewListEnvelope>;
};

type MountKit = {
  publishableKey: string;
  stripeAccountId: string;
  clientSecret: string;
  sessionId: string | null;
};

function mountKit(checkout: ProductCheckout): MountKit | null {
  if (
    !checkout.publishableKey ||
    !checkout.stripeAccountId ||
    !checkout.clientSecret
  ) {
    return null;
  }
  return {
    publishableKey: checkout.publishableKey,
    stripeAccountId: checkout.stripeAccountId,
    clientSecret: checkout.clientSecret,
    sessionId: checkout.sessionId,
  };
}

/** Poll the checkout until it is paid; ~60 s, then offer a retry. */
function useCheckoutReturn(
  productSlug: string,
  sessionId: string | null,
  getCheckoutState: ProductPageDependencies['getCheckoutState'],
  onPaid: (purchaseToken: string) => void,
) {
  const [state, setState] = useState<
    'idle' | 'polling' | 'waiting' | 'removed'
  >(sessionId ? 'polling' : 'idle');
  const [attempt, setAttempt] = useState(0);
  const paid = useEffectEvent(onPaid);

  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    let attempts = 0;
    let timer: number;
    setState('polling');
    const tick = async () => {
      attempts += 1;
      let result: ActionResult<ProductCheckoutStatus> | null = null;
      try {
        result = await getCheckoutState({ data: { productSlug, sessionId } });
      } catch {
        result = null;
      }
      if (stop) return;
      if (result?.ok && result.data.purchaseToken) {
        paid(result.data.purchaseToken);
        return;
      }
      if (result?.ok && result.data.status === 'access_removed') {
        setState('removed');
        return;
      }
      if (attempts >= 30) {
        setState('waiting');
        return;
      }
      timer = window.setTimeout(tick, 2000);
    };
    timer = window.setTimeout(tick, 500);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [attempt, getCheckoutState, productSlug, sessionId]);

  return {
    state,
    retry: () => setAttempt((value) => value + 1),
  };
}

export function ProductPageView({
  product,
  reviews,
  shareUrl,
  language,
  returnPath,
  sessionId,
  startInCheckout = false,
  dependencies,
  onPurchase,
}: {
  product: Product;
  reviews: ProductReviewListEnvelope | null;
  /** The product page's canonical URL, for "Copy link". */
  shareUrl: string;
  language: string;
  /** This page's own path, where Stripe sends the buyer back. */
  returnPath: string;
  /** Set when Stripe sent the buyer back. */
  sessionId: string | null;
  /** `?buy=true` from the listing: open the buying step at once. */
  startInCheckout?: boolean;
  dependencies: ProductPageDependencies;
  /** Go to the purchase's download page. */
  onPurchase: (purchaseToken: string) => void;
}) {
  const { user } = useRootSession();
  const [step, setStep] = useState<'product' | 'details'>(
    startInCheckout && !product.soldOut ? 'details' : 'product',
  );
  const [kit, setKit] = useState<MountKit | null>(null);
  const [kitSessionId, setKitSessionId] = useState<string | null>(null);
  const buyCardRef = useRef<HTMLDivElement>(null);
  const free = product.price.kind === 'free';
  const priceLabel = productPriceText(product.price);
  const ctaLabel =
    product.buttonLabel ??
    (free ? m.product_getFreeAction() : m.product_buyAction());
  const returning = useCheckoutReturn(
    product.slug,
    sessionId ?? kitSessionId,
    dependencies.getCheckoutState,
    onPurchase,
  );

  function openStep() {
    setStep('details');
    // The phone's sticky bar opens the step in the price card above.
    requestAnimationFrame(() =>
      buyCardRef.current?.scrollIntoView({ block: 'nearest' }),
    );
  }

  async function submit(
    values: ProductCheckoutValues,
  ): Promise<ProductCheckoutRefusal | void> {
    const result = await dependencies.startCheckout({
      data: { ...values, productSlug: product.slug, returnPath },
    });
    if (!result.ok) return { code: result.code, message: result.message };
    if (result.data.status === 'complete' && result.data.purchaseToken) {
      onPurchase(result.data.purchaseToken);
      return;
    }
    const nextKit = mountKit(result.data);
    if (!nextKit) return { code: null, message: '' };
    setKit(nextKit);
  }

  const handleStripeComplete = useCallback(() => {
    // Stripe normally redirects to the return URL; if it completes in place,
    // start confirming the payment here.
    setKitSessionId((current) => current ?? kit?.sessionId ?? null);
    setKit(null);
  }, [kit]);

  if (returning.state !== 'idle') {
    return (
      <CheckoutReturnState
        state={returning.state}
        productName={product.name}
        onRetry={returning.retry}
      />
    );
  }

  if (kit) {
    return (
      <Page width="wide">
        <PageContent
          header={
            <PageHeader
              title={m.product_completePurchaseTitle()}
              description={product.name}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setKit(null)}
                >
                  {m.product_backToProductAction()}
                </Button>
              }
            />
          }
        >
          <Suspense fallback={<Spinner className="mx-auto size-6" />}>
            <EmbeddedCheckout kit={kit} onComplete={handleStripeComplete} />
          </Suspense>
        </PageContent>
      </Page>
    );
  }

  const fileTypes = [
    ...fileTypeLabels(product.facts.fileTypes),
    ...(product.facts.linkCount > 0 ? [m.product_linkTypeLabel()] : []),
  ];
  const rating = product.ratingsEnabled ? product.rating : null;

  const buyCard = (
    <Card size="sm" className="gap-0 py-0" data-slot="product-buy-card">
      <CardContent className="flex flex-col gap-3 p-4">
        {step === 'details' && !product.soldOut ? (
          <Suspense fallback={<Spinner className="mx-auto size-5" />}>
            <ProductCheckoutForm
              product={product}
              defaultEmail={user?.email ?? null}
              onSubmit={submit}
              onCancel={() => setStep('product')}
            />
          </Suspense>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-foreground text-3xl font-semibold">
                {priceLabel}
              </span>
              {product.price.kind === 'pay_what_you_want' ? (
                <span className="text-muted-foreground text-sm">
                  {m.product_payWhatYouWantHint()}
                </span>
              ) : null}
            </div>
            {product.soldOut ? (
              <p
                role="status"
                className="text-muted-foreground text-sm font-medium"
              >
                {m.boardError_productSoldOutText()}
              </p>
            ) : (
              <Button size="lg" onClick={openStep}>
                {ctaLabel}
              </Button>
            )}
            <CopyLinkButton url={shareUrl} language={language} size="md" />
            <PurchaseResendDialog
              productSlug={product.slug}
              resend={dependencies.resendLink}
              defaultEmail={user?.email ?? null}
              trigger={
                <Button variant="link" size="sm" className="self-center">
                  {m.product_alreadyBoughtAction()}
                </Button>
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  );

  const factsRows = [
    ...product.details,
    ...(product.facts.pageCount
      ? [
          {
            label: m.product_pagesLabel(),
            value: String(product.facts.pageCount),
          },
        ]
      : []),
    ...(fileTypes.length > 0
      ? [
          {
            label: m.product_filesLabel(),
            value: filesFactValue(product),
          },
        ]
      : []),
  ];
  const factsCard =
    product.summary || factsRows.length > 0 ? (
      <Card size="sm" className="gap-0 py-0" data-slot="product-facts">
        <CardContent className="flex flex-col gap-3 p-4 text-sm">
          {product.summary ? (
            <div className="flex flex-col gap-1">
              <h2 className="text-foreground text-base font-semibold">
                {m.product_youGetHeading()}
              </h2>
              <p className="text-muted-foreground" dir="auto">
                {product.summary}
              </p>
            </div>
          ) : null}
          {factsRows.length > 0 ? (
            <dl
              className={cn(
                'flex flex-col gap-2',
                product.summary && 'border-border border-t pt-3',
              )}
            >
              {factsRows.map((row) => (
                <div
                  key={`${row.label}:${row.value}`}
                  className="flex justify-between gap-4"
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-foreground text-end" dir="auto">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </CardContent>
      </Card>
    ) : null;

  return (
    <>
      <PageLayout
        band={
          <div className="border-border bg-muted/50 border-b">
            <Container width="wide">
              <header className="flex flex-col gap-3 pt-(--header-space) pb-(--header-space)">
                <Link
                  to="/products"
                  className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  {m.products_metaTitle()}
                </Link>
                <Text
                  as="h1"
                  variant="heading2"
                  className="md:text-3xl"
                  dir="auto"
                >
                  {product.name}
                </Text>
                {fileTypes.length > 0 || product.soldOut ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {fileTypes.length > 0 ? (
                      <Badge variant="secondary">{fileTypes.join(' · ')}</Badge>
                    ) : null}
                    {product.soldOut ? (
                      <Badge variant="outline">
                        {m.product_soldOutLabel()}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                {rating && rating.count > 0 ? (
                  <a
                    href="#reviews"
                    className="text-muted-foreground w-fit text-sm"
                  >
                    <RatingSummary
                      average={rating.average}
                      count={rating.count}
                    />
                  </a>
                ) : null}
              </header>
            </Container>
          </div>
        }
      >
        <div
          data-slot="product-layout"
          className="flex flex-col gap-6 pb-24 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-10 lg:gap-y-8 lg:pb-0"
        >
          {product.images.length > 0 ? (
            <div className="order-1 lg:col-start-1 lg:row-start-1">
              <ProductGallery images={product.images} />
            </div>
          ) : null}
          <aside
            aria-label={m.product_purchaseRegionLabel()}
            className="contents lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-4"
          >
            <div ref={buyCardRef} className="order-2 scroll-mt-24">
              {buyCard}
            </div>
            {factsCard ? <div className="order-4">{factsCard}</div> : null}
          </aside>
          <div
            className={cn(
              'order-3 lg:col-start-1',
              product.images.length > 0 ? 'lg:row-start-2' : 'lg:row-start-1',
            )}
          >
            {product.description ? (
              <div
                className="text-foreground leading-relaxed whitespace-pre-line"
                dir="auto"
              >
                {product.description}
              </div>
            ) : null}
            {product.refundPolicy ? (
              <p className="text-muted-foreground mt-6 text-sm whitespace-pre-line">
                <span className="text-foreground font-medium">
                  {m.product_refundPolicyLabel()}
                </span>{' '}
                {product.refundPolicy}
              </p>
            ) : null}
          </div>
          {rating ? (
            <div
              className={cn(
                'order-5 lg:col-start-1',
                product.images.length > 0 ? 'lg:row-start-3' : 'lg:row-start-2',
              )}
            >
              <ProductReviews
                productSlug={product.slug}
                rating={rating}
                initial={reviews}
                loadReviews={dependencies.loadReviews}
              />
            </div>
          ) : null}
        </div>
      </PageLayout>
      {step === 'product' && !product.soldOut ? (
        <div
          data-slot="product-buy-bar"
          className="border-border bg-background fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
        >
          <span className="text-foreground text-lg font-semibold">
            {priceLabel}
          </span>
          <Button size="lg" className="flex-1" onClick={openStep}>
            {ctaLabel}
          </Button>
        </div>
      ) : null}
    </>
  );
}

/** "PDF, XLSX, 1 link". */
function filesFactValue(product: Product): string {
  const parts = fileTypeLabels(product.facts.fileTypes);
  if (product.facts.linkCount > 0) {
    parts.push(m.product_linkCount({ count: product.facts.linkCount }));
  }
  return parts.join(', ');
}

function ProductGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  return (
    <div className="flex flex-col gap-3">
      <ProductCover src={current} />
      {images.length > 1 ? (
        <div
          role="group"
          aria-label={m.product_galleryLabel()}
          className="flex flex-wrap gap-2"
        >
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              aria-label={m.product_showImageLabel({ index: index + 1 })}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
              className={cn(
                'focus-visible:ring-ring/50 overflow-hidden rounded-lg ring-offset-2 outline-none focus-visible:ring-2',
                index === active && 'ring-foreground ring-2',
              )}
            >
              <img
                src={image}
                alt=""
                loading="lazy"
                className="bg-muted h-11 w-18 object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProductReviews({
  productSlug,
  rating,
  initial,
  loadReviews,
}: {
  productSlug: string;
  rating: NonNullable<Product['rating']>;
  initial: ProductReviewListEnvelope | null;
  loadReviews: ProductPageDependencies['loadReviews'];
}) {
  const [items, setItems] = useState<ProductReview[]>(initial?.data ?? []);
  const [cursor, setCursor] = useState(
    initial?.hasMore ? (initial.nextCursor ?? null) : null,
  );
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const locale = getLocale();

  async function more() {
    if (!cursor) return;
    setLoading(true);
    setFailed(false);
    try {
      const page = await loadReviews({ data: { productSlug, cursor } });
      setItems((previous) => [...previous, ...page.data]);
      setCursor(page.hasMore ? (page.nextCursor ?? null) : null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="reviews"
      aria-labelledby="product-reviews-heading"
      className="border-border flex scroll-mt-24 flex-col gap-5 border-t pt-6"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id="product-reviews-heading"
          className="text-foreground text-lg font-semibold"
        >
          {m.product_reviewsHeading()}
        </h2>
        <RatingSummary
          average={rating.average}
          count={rating.count}
          className="text-muted-foreground text-sm"
        />
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {m.product_noReviewsText()}
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {items.map((review) => (
            <li key={review.id} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <ReviewStars stars={review.stars} />
                <span className="text-foreground font-semibold" dir="auto">
                  {review.displayName ?? m.product_anonymousBuyerLabel()}
                </span>
                <span className="text-muted-foreground">
                  {m.product_verifiedBuyerLabel()} ·{' '}
                  {formatDate(locale, review.createdAt) ??
                    review.createdAt.slice(0, 10)}
                </span>
              </div>
              {review.comment ? (
                <p className="text-foreground whitespace-pre-line" dir="auto">
                  {review.comment}
                </p>
              ) : null}
              {review.reply ? (
                <p className="border-border text-muted-foreground mt-1 border-s-2 ps-3 text-sm">
                  <span className="text-foreground font-medium">
                    {m.product_operatorReplyLabel()}
                  </span>{' '}
                  {review.reply}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {cursor ? (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void more()}
          >
            {loading ? <Spinner data-icon="inline-start" /> : null}
            {m.product_showAllReviewsAction()}
          </Button>
          {failed ? (
            <span role="alert" className="text-destructive text-sm">
              {m.boardError_genericText()}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CheckoutReturnState({
  state,
  productName,
  onRetry,
}: {
  state: 'polling' | 'waiting' | 'removed';
  productName: string;
  onRetry: () => void;
}) {
  if (state === 'polling') {
    return (
      <Page width="content">
        <PageContent header={<PageHeader title={productName} />}>
          <Empty className="min-h-80 border-0" data-test="product-confirming">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Spinner className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{m.product_confirmingTitle()}</EmptyTitle>
              <EmptyDescription>{m.product_confirmingText()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PageContent>
      </Page>
    );
  }
  return (
    <Page width="content">
      <PageContent>
        <EmptyState
          icon={
            state === 'removed' ? (
              <ShoppingBag aria-hidden="true" />
            ) : (
              <Clock aria-hidden="true" />
            )
          }
          title={productName}
          description={
            state === 'removed'
              ? m.product_accessRemovedText()
              : m.product_paymentPendingText()
          }
          action={
            state === 'waiting' ? (
              <Button variant="outline" onClick={onRetry}>
                {m.appError_retryAction()}
              </Button>
            ) : undefined
          }
        />
      </PageContent>
    </Page>
  );
}
