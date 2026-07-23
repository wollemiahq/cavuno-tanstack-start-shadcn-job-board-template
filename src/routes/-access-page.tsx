/**
 * The candidate job-access paywall page component, colocated with the
 * `/account/access` route as a non-route module (leading `-`) so the route file
 * exports only `Route` and stays cleanly code-split. Reads its route data via
 * `getRouteApi` (repo convention) rather than importing the route back.
 *
 * Return path: viewers arrive from a gated jobs listing via the "Unlock more
 * roles" teaser, which carries the originating path as `?returnTo=…`. It rides
 * the URL through the plan picker and the in-page embedded checkout (Stripe's
 * `onComplete` never navigates away, so the param survives), and once the grant
 * is confirmed we send the buyer back there — sanitized with `safeRedirectPath`.
 * With no captured path the entitled state is the fallback destination.
 */
import { useCallback, useEffect, useState } from 'react';

import { safeRedirectPath } from '@cavuno/board/server';
import { getRouteApi, useRouter } from '@tanstack/react-router';
import { Clock, Lock, ShieldCheck, Sparkles } from 'lucide-react';

import { EmbeddedCheckout } from '../components/paywall/embedded-checkout';
import { m } from '../paraglide/messages';
import {
  getAccessGrant,
  openBillingPortal,
  startCheckout,
} from '../server/paywall';

import { EmptyState } from '@/components/empty-state';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { toastActionError } from '@/lib/action-toast';
import { cn } from '@/lib/utils';
import type { AccessCheckoutSession, PaywallOffer } from '@cavuno/board';

/** The paywall page's own path — the return-to fallback and the loader's redirect target. */
export const RETURN_PATH = '/account/access';

const routeApi = getRouteApi('/account_/access');

/**
 * A `returnTo` search param is buyer-controlled, so it is never trusted raw:
 * `safeRedirectPath` collapses anything that isn't a same-origin relative path
 * to the fallback, and we drop a path that points back at this page to avoid a
 * post-payment loop. Returns null when there is no safe path to return to.
 */
function safeReturnTo(value: string | undefined): string | null {
  if (!value) return null;
  const safe = safeRedirectPath(value, RETURN_PATH);
  const pathname = safe.split(/[?#]/, 1)[0];
  return pathname === RETURN_PATH ? null : safe;
}

function formatPrice(amountCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

/** A button-styled "Browse jobs" navigation link, shared by the entitled states. */
function BrowseJobsLink({
  variant = 'outline',
}: {
  variant?: 'default' | 'outline';
}) {
  return (
    <a href="/" className={buttonVariants({ variant })}>
      {m.accountAccess_browseJobsLink()}
    </a>
  );
}

/** One selectable plan tier. The board's default offer gets the "Popular" ring. */
function PlanCard({
  offer,
  busy,
  onChoose,
}: {
  offer: PaywallOffer;
  busy: string | null;
  onChoose: (offer: PaywallOffer) => void;
}) {
  const popular = offer.isDefault;
  return (
    <Card className={cn('flex flex-col', popular && 'ring-primary ring-2')}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{offer.label}</span>
          {popular ? <Badge>{m.accountAccess_popularBadge()}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="flex items-baseline gap-1.5">
          <span className="font-heading text-3xl font-semibold tracking-tight">
            {formatPrice(offer.amountCents, offer.currency)}
          </span>
          <span className="text-muted-foreground text-sm">
            {offer.billingLabel}
          </span>
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={popular ? 'default' : 'outline'}
          onClick={() => onChoose(offer)}
          disabled={busy !== null}
        >
          {busy === offer.offerKey
            ? m.accountAccess_startingLabel()
            : m.accountAccess_chooseLabel()}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function AccessPage() {
  const { grant, offers } = routeApi.useLoaderData();
  const { session_id, returnTo: returnToRaw } = routeApi.useSearch();
  const router = useRouter();

  // Where the buyer was browsing when they hit the paywall (sanitized). It
  // rides the URL from the "Unlock more roles" teaser through the whole flow.
  const returnTo = safeReturnTo(returnToRaw);

  const [kit, setKit] = useState<AccessCheckoutSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  // Returning from Stripe with a session id means a checkout just completed —
  // poll the grant until the webhook has recorded it.
  const [polling, setPolling] = useState(
    Boolean(session_id) && !grant.hasAccess,
  );

  const hasAccess = grant.hasAccess || confirmed;

  // A grant that just landed (confirmed in-page, or returned from Stripe with a
  // session id) with a captured return path means we bounce the buyer back to
  // where they were rather than parking them on this page.
  const redirecting =
    returnTo !== null && hasAccess && (confirmed || Boolean(session_id));

  useEffect(() => {
    if (!redirecting || returnTo === null) return;
    void router.navigate({ href: returnTo }).catch(() => toastActionError());
  }, [redirecting, returnTo, router]);

  useEffect(() => {
    if (!polling || hasAccess) return;
    let stop = false;
    let attempts = 0;
    // Track the LATEST scheduled timer so cleanup cancels the recursive one,
    // not just the first — otherwise a queued tick fires after unmount.
    let timerId: number;
    const tick = async () => {
      attempts += 1;
      let next;
      try {
        next = await getAccessGrant();
      } catch {
        if (stop) return;
        setPolling(false);
        setExhausted(true);
        void toastActionError();
        return;
      }
      if (stop) return;
      if (next.hasAccess) {
        setConfirmed(true);
        setPolling(false);
        void router.invalidate().catch(() => toastActionError());
      } else if (attempts < 30) {
        timerId = window.setTimeout(tick, 2000);
      } else {
        setPolling(false);
        setExhausted(true);
      }
    };
    timerId = window.setTimeout(tick, 2000);
    return () => {
      stop = true;
      window.clearTimeout(timerId);
    };
  }, [polling, hasAccess, router]);

  // A stable reference so mounting the embedded checkout doesn't re-run its
  // effect (and destroy/remount the live Stripe iframe) on every render.
  const handleCheckoutComplete = useCallback(() => {
    setPolling(true);
  }, []);

  async function buy(offer: PaywallOffer) {
    setBusy(offer.offerKey);
    try {
      const mountKit = await startCheckout({
        data: { offerKey: offer.offerKey, returnPath: RETURN_PATH },
      });
      setKit(mountKit);
    } catch {
      void toastActionError();
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    setBusy('portal');
    try {
      const { url } = await openBillingPortal({
        data: { returnPath: RETURN_PATH },
      });
      window.location.href = url;
    } catch {
      void toastActionError();
    } finally {
      setBusy(null);
    }
  }

  // Returning the buyer to where they left off — a brief bridge while the
  // client navigation runs, so the entitled state never flashes first.
  if (redirecting) {
    return (
      <Page width="content">
        <PageContent header={<PageHeader title={m.accountAccess_title()} />}>
          <Empty className="min-h-80 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Spinner className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{m.accountAccess_redirectingText()}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </PageContent>
      </Page>
    );
  }

  // Entitled: recurring grants get the billing portal, lifetime grants a note.
  if (hasAccess) {
    const isRecurring = grant.offerType === 'recurring';
    const isLifetime = grant.offerType === 'lifetime';
    return (
      <Page width="content">
        <PageContent
          header={
            <PageHeader
              title={m.accountAccess_title()}
              actions={
                <Badge variant={isLifetime ? 'secondary' : 'default'}>
                  {isLifetime
                    ? m.accountAccess_lifetimeBadge()
                    : m.accountAccess_activeBadge()}
                </Badge>
              }
            />
          }
        >
          <Card>
            <CardContent className="flex flex-col items-start gap-4">
              <span className="bg-muted text-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
                {isLifetime ? (
                  <Sparkles className="size-5" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="size-5" aria-hidden="true" />
                )}
              </span>
              <div className="space-y-1.5">
                <p className="font-heading text-lg font-medium tracking-tight">
                  {isLifetime
                    ? m.accountAccess_lifetimeBody()
                    : m.accountAccess_activeBody()}
                </p>
                {isRecurring ? (
                  <p className="text-muted-foreground text-sm">
                    {m.accountAccess_manageSubscriptionBody()}
                  </p>
                ) : null}
              </div>
            </CardContent>
            <CardFooter className="flex-wrap gap-3">
              {isRecurring ? (
                <Button onClick={manage} disabled={busy === 'portal'}>
                  {busy === 'portal'
                    ? m.accountAccess_openingLabel()
                    : m.accountAccess_manageSubscriptionLabel()}
                </Button>
              ) : null}
              <BrowseJobsLink variant={isRecurring ? 'outline' : 'default'} />
            </CardFooter>
          </Card>
        </PageContent>
      </Page>
    );
  }

  // Checkout: the embedded Stripe form runs at the full page width. It centres
  // its own column and needs room for the two-column layout, so it is not
  // wrapped in an inner max-width card (see file header).
  if (kit) {
    return (
      <Page width="wide">
        <PageContent
          header={
            <PageHeader
              title={m.accountAccess_completePurchaseTitle()}
              description={m.accountAccess_completePurchaseSubtitle()}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setKit(null)}
                >
                  {m.accountAccess_backToPlansLabel()}
                </Button>
              }
            />
          }
        >
          <EmbeddedCheckout kit={kit} onComplete={handleCheckoutComplete} />
        </PageContent>
      </Page>
    );
  }

  // Confirming: waiting on the webhook after Stripe returns the buyer.
  if (polling) {
    return (
      <Page width="content">
        <PageContent header={<PageHeader title={m.accountAccess_title()} />}>
          <Empty className="min-h-80 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Spinner className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{m.accountAccess_confirmingText()}</EmptyTitle>
              <EmptyDescription>
                {m.accountAccess_confirmingSubtitle()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PageContent>
      </Page>
    );
  }

  // Exhausted: the poll timed out (or failed) but the payment went through.
  if (exhausted) {
    return (
      <Page width="content">
        <PageContent>
          <EmptyState
            icon={<Clock aria-hidden="true" />}
            title={m.accountAccess_paymentReceivedTitle()}
            description={m.accountAccess_paymentReceivedBody()}
            action={
              <Button
                onClick={async () => {
                  try {
                    await router.invalidate();
                  } catch {
                    void toastActionError();
                  }
                }}
              >
                {m.accountAccess_refreshLabel()}
              </Button>
            }
          />
        </PageContent>
      </Page>
    );
  }

  // Paywall off / no tiers configured.
  if (offers.length === 0) {
    return (
      <Page width="content">
        <PageContent>
          <EmptyState
            icon={<Lock aria-hidden="true" />}
            title={m.accountAccess_noOffersTitle()}
            description={m.accountAccess_noOffersText()}
            action={<BrowseJobsLink />}
          />
        </PageContent>
      </Page>
    );
  }

  // Plan picker.
  return (
    <Page width="content">
      <PageContent
        header={
          <PageHeader
            title={m.accountAccess_unlockTitle()}
            description={m.accountAccess_unlockSubtitle()}
          />
        }
      >
        <div
          className={cn(
            'grid gap-4',
            offers.length > 1 ? 'sm:grid-cols-2' : 'mx-auto w-full max-w-sm',
          )}
        >
          {offers.map((offer) => (
            <PlanCard
              key={offer.offerKey}
              offer={offer}
              busy={busy}
              onChoose={buy}
            />
          ))}
        </div>
      </PageContent>
    </Page>
  );
}
