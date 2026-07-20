/**
 * Candidate job-access paywall reference flow (doc 36 / ADR-0056):
 *
 *   offers → connected-account embedded checkout → poll grant → ungated + manage
 *
 * The loader fetches the entitlement + the offer tiers. A non-entitled viewer
 * picks a tier → `startCheckout` returns a mount kit → `<EmbeddedCheckout>`
 * mounts Stripe for the board's connected account. Stripe returns the buyer to
 * this route with `?session_id=…`; we poll `getAccessGrant` until it flips to
 * `hasAccess`, then re-render the entitled state (Manage-subscription portal
 * for recurring grants, a lifetime note for one-time grants).
 *
 * Every branch is a full Page composition (PageHeader + PageContent) so the
 * offers, checkout, confirming, entitled, and error surfaces all read like real
 * app pages rather than bare stacked text. Widths are intentional per state: the
 * checkout stays `wide` with a centred `max-w-4xl` shell because Stripe's
 * embedded form only lays out two-column above ~750px of container width.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  createFileRoute,
  isRedirect,
  redirect,
  useRouter,
} from '@tanstack/react-router';
import { Clock, Lock, ShieldCheck, Sparkles } from 'lucide-react';

import { EmbeddedCheckout } from '../components/paywall/embedded-checkout';
import { m } from '../paraglide/messages';
import {
  getAccessGrant,
  getPaywallOffers,
  openBillingPortal,
  startCheckout,
} from '../server/paywall';
import { getSeoBase } from '../server/queries';

import {
  CandidateRouteErrorPage,
  CandidateRoutePendingPage,
} from '@/components/candidate-route-state';
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
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';
import { cn } from '@/lib/utils';
import type { AccessCheckoutSession, PaywallOffer } from '@cavuno/board';

const RETURN_PATH = '/account/access';

function formatPrice(amountCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export const Route = createFileRoute('/account_/access')({
  staticData: { ownsMain: true },
  pendingComponent: CandidateRoutePendingPage,
  errorComponent: CandidateRouteErrorPage,
  // The key is omitted rather than set to `undefined` when absent, so plain
  // `<Link to="/account/access">` (the header avatar menu) needs no search
  // prop and renders without a trailing `?`.
  validateSearch: (search: Record<string, unknown>): { session_id?: string } =>
    typeof search.session_id === 'string' && search.session_id
      ? { session_id: search.session_id }
      : {},
  loader: async () => {
    try {
      const [grant, offers] = await Promise.all([
        getAccessGrant(),
        getPaywallOffers(),
      ]);
      return { grant, offers: offers.data, seo: await getSeoBase() };
    } catch (error) {
      if (isRedirect(error)) throw error;
      const authFailure = candidateLoaderError(error);
      if (authFailure === 'email-unverified') {
        throw redirect({
          to: '/auth/verify-email-required',
          search: { returnTo: RETURN_PATH },
        });
      }
      if (authFailure === 'unauthenticated') {
        throw redirect({
          to: '/auth/sign-in',
          search: { returnTo: RETURN_PATH },
        });
      }
      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(loaderData?.seo.boardName, m.accountAccess_title()),
      },
    ],
  }),
  component: AccessPage,
});

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
    <Card
      className={cn(
        'flex flex-col',
        popular && 'ring-primary ring-2',
      )}
    >
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
  const { grant, offers } = Route.useLoaderData();
  const { session_id } = Route.useSearch();
  const router = useRouter();

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
            <CardFooter className="flex-wrap gap-3 border-t">
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

  // Checkout: Stripe's embedded form gets the wide shell (see file header).
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
          <div className="mx-auto w-full max-w-4xl">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Lock
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                  {m.accountAccess_secureCheckoutLabel()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmbeddedCheckout
                  kit={kit}
                  onComplete={handleCheckoutComplete}
                />
              </CardContent>
            </Card>
          </div>
        </PageContent>
      </Page>
    );
  }

  // Confirming: waiting on the webhook after Stripe returns the buyer.
  if (polling) {
    return (
      <Page width="content">
        <PageContent
          header={<PageHeader title={m.accountAccess_title()} />}
        >
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
            align="center"
            title={m.accountAccess_unlockTitle()}
            description={m.accountAccess_unlockSubtitle()}
          />
        }
      >
        <div
          className={cn(
            'grid gap-4',
            offers.length > 1
              ? 'sm:grid-cols-2'
              : 'mx-auto w-full max-w-sm',
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
