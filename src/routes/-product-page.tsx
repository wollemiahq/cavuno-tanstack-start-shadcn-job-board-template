/**
 * `/products/$productSlug` — the product page. The cover images and the
 * title with the seller line run the full width; below them the main column
 * holds the formatted description and the reviews (rating distribution
 * first), and the rail beside it holds the price card and the facts table,
 * staying in view while the reader scrolls when it fits the window. On a
 * phone the order is cover, title, price card, description, facts, reviews,
 * with a buy bar at the bottom once the price card has scrolled away.
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
import { ArrowLeft, Check, X } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import {
  fileTypeLabels,
  formatRating,
  ownedPurchase,
  productFactRows,
  type ProductFactRow,
} from '@/board/product-view-model';
import { CopyLinkButton } from '@/components/board/copy-link-button';
import { ProductCarousel } from '@/components/board/product-carousel';
import type {
  ProductCheckoutRefusal,
  ProductCheckoutValues,
} from '@/components/board/product-checkout-form';
import { ProductRatingHistogram } from '@/components/board/product-rating-histogram';
import {
  RatingSummary,
  ReviewStars,
  productButtonText,
  productPriceText,
} from '@/components/board/product-ui';
import {
  PurchaseResendDialog,
  type ResendLinkAction,
} from '@/components/board/purchase-resend-dialog';
import { HeaderRouteActions } from '@/components/header-route-actions';
import { Container } from '@/components/layout/container';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { Prose } from '@/components/prose';
import { useRootSession } from '@/components/root-session';
import { Text } from '@/components/text';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type {
  Product,
  ProductCheckout,
  ProductCheckoutStatus,
  ProductReview,
  ProductReviewListEnvelope,
  PurchaseSummary,
  PurchaseSummaryListEnvelope,
} from '@cavuno/board';

// Loaded when the buyer starts buying: the product page itself stays light.
const ProductCheckoutForm = lazy(() =>
  import('@/components/board/product-checkout-form').then((module) => ({
    default: module.ProductCheckoutForm,
  })),
);
// Only a buyer coming back from Stripe sees the confirming states.
const CheckoutReturnState = lazy(() =>
  import('@/components/board/product-checkout-return').then((module) => ({
    default: module.CheckoutReturnState,
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
  /** The signed-in visitor's library (`/me/purchases`). */
  loadMyPurchases: () => Promise<PurchaseSummaryListEnvelope>;
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

/**
 * The signed-in visitor's own purchase of this product, or null. Read in the
 * browser after the page has loaded, and only for a signed-in visitor, so the
 * shared (edge-cached) product page never carries anyone's purchases. A
 * failed read leaves the usual buy card. The purchase is kept with the user
 * it was read for, so signing out (or in as someone else) drops it at once.
 */
function useOwnedPurchase(
  productSlug: string,
  userId: string | null,
  loadMyPurchases: ProductPageDependencies['loadMyPurchases'],
): PurchaseSummary | null {
  const [owned, setOwned] = useState<{
    userId: string;
    purchase: PurchaseSummary | null;
  } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadMyPurchases().then(
      (library) => {
        if (cancelled) return;
        setOwned({
          userId,
          purchase: ownedPurchase(library.data, productSlug),
        });
      },
      () => {
        if (!cancelled) setOwned({ userId, purchase: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loadMyPurchases, productSlug, userId]);
  return owned && userId && owned.userId === userId ? owned.purchase : null;
}

/** A link styled as a button to the buyer's download page. */
function DownloadPageLink({
  purchase,
  size,
  className,
}: {
  purchase: PurchaseSummary;
  size: 'default' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <Link
      to="/purchases/$purchaseToken"
      params={{ purchaseToken: purchase.purchaseToken }}
      className={cn(buttonVariants({ size }), 'hover:no-underline', className)}
    >
      {m.product_openDownloadPageAction()}
    </Link>
  );
}

/**
 * The desktop header's actions on the product page (`lg` and up): the
 * stars, the price and the buy button, which opens the same buying step as
 * the price card. A buyer who owns the product gets their download page.
 */
function ProductHeaderActions({
  rating,
  priceLabel,
  ctaLabel,
  soldOut,
  owned,
  onBuy,
}: {
  rating: Product['rating'] | null;
  priceLabel: string;
  ctaLabel: string;
  soldOut: boolean;
  owned: PurchaseSummary | null;
  onBuy: () => void;
}) {
  return (
    <div
      data-slot="product-header-actions"
      className="flex items-center gap-4 text-sm whitespace-nowrap"
    >
      <ReviewsLink rating={rating} />
      <span className="text-foreground text-base font-semibold">
        {priceLabel}
      </span>
      {owned ? (
        <DownloadPageLink purchase={owned} size="default" />
      ) : soldOut ? (
        <Button disabled>{m.product_soldOutLabel()}</Button>
      ) : (
        <Button onClick={onBuy}>{ctaLabel}</Button>
      )}
    </div>
  );
}

/** The board selling the product: the seller line under the title. */
export type ProductSeller = { name: string; logoUrl: string | null };

export function ProductPageView({
  product,
  seller,
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
  seller: ProductSeller;
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
  // Elements in state, not refs: the page unmounts while Stripe Checkout
  // shows, and the observers must follow the remounted elements.
  const [buyCardElement, setBuyCardElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [railElement, setRailElement] = useState<HTMLElement | null>(null);
  const buyCardInView = useInView(buyCardElement);
  const railFits = useFitsViewport(railElement);
  const priceLabel = productPriceText(product.price);
  const ctaLabel = productButtonText(product);
  const owned = useOwnedPurchase(
    product.slug,
    user?.id ?? null,
    dependencies.loadMyPurchases,
  );
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
      <Suspense fallback={<Spinner className="mx-auto my-24 size-6" />}>
        <CheckoutReturnState
          state={returning.state}
          productName={product.name}
          onRetry={returning.retry}
        />
      </Suspense>
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
  const salesCount = product.salesCount;

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
        ) : owned ? (
          // The signed-in buyer already owns it: their download page first,
          // buying another copy stays possible.
          <>
            <p
              data-slot="product-owned"
              className="text-foreground text-lg font-semibold"
            >
              {m.product_youBoughtThisText()}
            </p>
            <DownloadPageLink purchase={owned} size="xl" />
            <CopyLinkButton url={shareUrl} language={language} size="md" />
            {product.soldOut ? null : (
              <Button
                variant="link"
                size="sm"
                className="self-center"
                onClick={openStep}
              >
                {m.product_buyAgainAction()}
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-foreground text-3xl font-semibold lg:text-[2rem] lg:tracking-tight">
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
              <Button size="xl" onClick={openStep}>
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
            {salesCount !== null ? (
              <p
                data-slot="product-sales-count"
                className="text-muted-foreground text-center text-sm"
              >
                {m.product_salesCount({ count: salesCount })}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );

  // The seller's own rows win over a computed row with the same label.
  const factsRows = productFactRows(product.details, [
    ...(product.facts.pageCount
      ? [
          {
            kind: 'text' as const,
            label: m.product_pagesLabel(),
            value: String(product.facts.pageCount),
          },
        ]
      : []),
    ...(fileTypes.length > 0
      ? [
          {
            kind: 'text' as const,
            label: m.product_filesLabel(),
            value: filesFactValue(product),
          },
        ]
      : []),
  ]);
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
              {factsRows.map((row, index) => (
                <div
                  key={`${index}:${row.label}`}
                  className="flex justify-between gap-4"
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <FactValue row={row} />
                </div>
              ))}
            </dl>
          ) : null}
        </CardContent>
      </Card>
    ) : null;

  return (
    <>
      <Page width="wide">
        <main data-layout="product-page">
          <Container width="wide">
            {/* Desktop: back link, the cover and the title block run the
                full width; the rail starts beside the description below
                the divider. Phones stack everything in reading order. */}
            <div className="mx-auto flex w-full max-w-[77rem] flex-col gap-4 pt-8 pb-32 md:pt-10 lg:pt-6 lg:pb-16">
              <Link
                to="/products"
                className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4 rtl:rotate-180"
                />
                {m.products_metaTitle()}
              </Link>
              <div className="flex flex-col gap-6 lg:gap-0">
                {product.images.length > 0 ? (
                  <ProductCarousel images={product.images} />
                ) : null}
                <header className="border-border flex flex-col gap-2 lg:gap-2.5 lg:border-b lg:pt-7 lg:pb-5">
                  <Text as="h1" variant="headline" dir="auto">
                    {product.name}
                  </Text>
                  <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4">
                    <SellerLine seller={seller} rating={rating} />
                    {fileTypes.length > 0 || product.soldOut ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {fileTypes.length > 0 ? (
                          <Badge variant="secondary">
                            {fileTypes.join(' · ')}
                          </Badge>
                        ) : null}
                        {product.soldOut ? (
                          <Badge variant="outline">
                            {m.product_soldOutLabel()}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </header>
                <div
                  data-slot="product-layout"
                  className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-12 lg:gap-y-8 lg:pt-8"
                >
                  <aside
                    ref={setRailElement}
                    aria-label={m.product_purchaseRegionLabel()}
                    data-sticky={railFits ? 'true' : 'false'}
                    className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:data-[sticky=true]:sticky lg:data-[sticky=true]:top-24"
                  >
                    <div
                      ref={(element) => {
                        buyCardRef.current = element;
                        setBuyCardElement(element);
                      }}
                      className="scroll-mt-24"
                    >
                      {buyCard}
                    </div>
                    {/* The rail's copy; phones read it after the description. */}
                    {factsCard ? (
                      <div className="hidden lg:block">{factsCard}</div>
                    ) : null}
                  </aside>
                  <div
                    data-slot="product-description"
                    className="lg:col-start-1 lg:row-start-1"
                  >
                    {product.descriptionHtml ? (
                      <Prose html={product.descriptionHtml} />
                    ) : product.description ? (
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
                  {factsCard ? (
                    <div className="lg:hidden">{factsCard}</div>
                  ) : null}
                  {rating ? (
                    <div className="lg:col-start-1 lg:row-start-2">
                      <ProductReviews
                        productSlug={product.slug}
                        rating={rating}
                        initial={reviews}
                        loadReviews={dependencies.loadReviews}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Container>
        </main>
      </Page>
      <HeaderRouteActions>
        <ProductHeaderActions
          rating={rating}
          priceLabel={priceLabel}
          ctaLabel={ctaLabel}
          soldOut={product.soldOut}
          owned={owned}
          onBuy={openStep}
        />
      </HeaderRouteActions>
      {step === 'product' && (owned || !product.soldOut) && !buyCardInView ? (
        <div
          data-slot="product-buy-bar"
          className="border-border bg-background fixed inset-x-0 bottom-[var(--board-floating-bottom,0px)] z-40 flex items-center gap-3 border-t px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
        >
          <div className="flex min-w-0 flex-col">
            <span className="text-foreground text-lg font-semibold">
              {priceLabel}
            </span>
            {rating ? (
              <RatingSummary
                average={rating.average}
                count={rating.count}
                className="text-muted-foreground text-xs"
              />
            ) : null}
          </div>
          {owned ? (
            <DownloadPageLink purchase={owned} size="lg" className="flex-1" />
          ) : (
            <Button size="lg" className="flex-1" onClick={openStep}>
              {ctaLabel}
            </Button>
          )}
        </div>
      ) : null}
    </>
  );
}

/**
 * Whether the element is on screen. Starts `true` so the server render and
 * the first paint never show the phone's buy bar over a visible price card.
 */
function useInView(element: HTMLElement | null): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (!element || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setInView(entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return inView;
}

/** The sticky rail's top offset (`top-24`) plus a little room below. */
const RAIL_STICKY_CLEARANCE_PX = 96 + 16;

/**
 * Whether the rail fits the window below the sticky header. A rail taller
 * than the window must scroll with the page, or its bottom would be out of
 * reach until the end of the page.
 */
function useFitsViewport(element: HTMLElement | null): boolean {
  const [fits, setFits] = useState(true);
  useEffect(() => {
    if (!element) return;
    const measure = () =>
      setFits(
        element.offsetHeight + RAIL_STICKY_CLEARANCE_PX <= window.innerHeight,
      );
    measure();
    window.addEventListener('resize', measure);
    const observer = window.ResizeObserver ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [element]);
  return fits;
}

/** A facts row's value: the text, or a tick or a cross for a yes/no row. */
function FactValue({ row }: { row: ProductFactRow }) {
  if (row.kind === 'text') {
    return (
      <dd className="text-foreground text-end" dir="auto">
        {row.value}
      </dd>
    );
  }
  return (
    <dd data-slot="product-fact-check" data-checked={row.checked}>
      <span
        className={cn(
          'inline-flex size-5 items-center justify-center rounded-full',
          row.checked
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {row.checked ? (
          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
        ) : (
          <X aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
        )}
        <span className="sr-only">
          {row.checked ? m.product_detailYes() : m.product_detailNo()}
        </span>
      </span>
    </dd>
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

/** The board's logo and name, then the stars linking down to the reviews. */
function SellerLine({
  seller,
  rating,
}: {
  seller: ProductSeller;
  rating: Product['rating'] | null;
}) {
  return (
    <div
      data-slot="product-seller"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
    >
      <span className="text-foreground inline-flex items-center gap-2 font-medium">
        {seller.logoUrl ? (
          <img
            src={seller.logoUrl}
            alt=""
            className="h-6 w-auto max-w-24 object-contain"
          />
        ) : (
          <Avatar size="sm" aria-hidden="true">
            <AvatarFallback variant="inverse">
              {initials(seller.name)}
            </AvatarFallback>
          </Avatar>
        )}
        <span dir="auto">{seller.name}</span>
      </span>
      <ReviewsLink rating={rating} />
    </div>
  );
}

/** The stars and "4.6 (7 ratings)", linking down to the reviews. */
function ReviewsLink({ rating }: { rating: Product['rating'] | null }) {
  if (!rating || rating.average === null || rating.count === 0) return null;
  return (
    <a
      href="#reviews"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
    >
      <span aria-hidden="true">
        <ReviewStars stars={rating.average} />
      </span>
      {m.product_ratingLong({
        rating: formatRating(getLocale(), rating.average),
        count: rating.count,
      })}
    </a>
  );
}

/** "Career Moves Jobs" → "CM". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0]?.toLocaleUpperCase() ?? '')
    .join('');
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
      <h2
        id="product-reviews-heading"
        className="text-foreground text-lg font-semibold"
      >
        {m.product_reviewsHeading()}
      </h2>
      {rating.count > 0 ? <ProductRatingHistogram rating={rating} /> : null}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {m.product_noReviewsText()}
        </p>
      ) : (
        <ul className="border-border flex flex-col divide-y border-t">
          {items.map((review) => (
            <li key={review.id} className="flex flex-col gap-1 py-4">
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
                <p
                  className="text-foreground break-words whitespace-pre-line"
                  dir="auto"
                >
                  {review.comment}
                </p>
              ) : null}
              {review.reply ? (
                <p className="bg-muted text-muted-foreground mt-2 rounded-lg px-3 py-2 text-sm break-words">
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
