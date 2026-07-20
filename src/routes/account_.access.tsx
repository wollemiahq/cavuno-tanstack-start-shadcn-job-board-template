/**
 * Candidate job-access paywall reference flow (doc 36 / ADR-0056):
 *
 *   offers → connected-account embedded checkout → poll grant → ungated + manage
 *
 * The loader fetches the entitlement + the offer tiers. A non-entitled viewer
 * picks a tier → `startCheckout` returns a mount kit → `<EmbeddedCheckout>`
 * mounts Stripe for the board's connected account. Stripe returns the buyer to
 * this route with `?session_id=…`; we poll `getAccessGrant` until it flips to
 * `hasAccess`, then re-render the entitled state (with a Manage-subscription
 * link for recurring grants).
 */
import { useCallback, useEffect, useState } from 'react';

import {
  createFileRoute,
  isRedirect,
  redirect,
  useRouter,
} from '@tanstack/react-router';

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
import { CandidateShell } from '@/components/candidate-shell';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toastActionError } from '@/lib/action-toast';
import { candidateLoaderError } from '@/lib/candidate-loader-error';
import { headTitle } from '@/lib/page-title';
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
  component: AccessPageShell,
});

function AccessPageShell() {
  return (
    <CandidateShell>
      <AccessPage />
    </CandidateShell>
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

  if (hasAccess) {
    return (
      <section className="mx-auto max-w-xl space-y-4 py-10">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {m.accountAccess_title()}
          </h1>
          <Badge>{m.accountAccess_activeBadge()}</Badge>
        </div>
        <p className="text-muted-foreground">{m.accountAccess_activeBody()}</p>
        {grant.offerType === 'recurring' ? (
          <Button onClick={manage} disabled={busy === 'portal'}>
            {busy === 'portal'
              ? m.accountAccess_openingLabel()
              : m.accountAccess_manageSubscriptionLabel()}
          </Button>
        ) : null}
        <div>
          <a
            href="/"
            className={buttonVariants({ variant: 'link', size: 'sm' })}
          >
            {m.accountAccess_browseJobsLink()}
          </a>
        </div>
      </section>
    );
  }

  if (kit) {
    return (
      <section className="mx-auto max-w-xl space-y-4 py-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {m.accountAccess_completePurchaseTitle()}
        </h1>
        <EmbeddedCheckout kit={kit} onComplete={handleCheckoutComplete} />
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto w-fit p-0"
          onClick={() => setKit(null)}
        >
          {m.accountAccess_backToPlansLabel()}
        </Button>
      </section>
    );
  }

  if (polling) {
    return (
      <section className="mx-auto max-w-xl py-10">
        <p className="text-muted-foreground">
          {m.accountAccess_confirmingText()}
        </p>
      </section>
    );
  }

  if (exhausted) {
    return (
      <section className="mx-auto max-w-xl space-y-3 py-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {m.accountAccess_paymentReceivedTitle()}
        </h1>
        <p className="text-muted-foreground">
          {m.accountAccess_paymentReceivedBody()}
        </p>
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
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {m.accountAccess_unlockTitle()}
        </h1>
        <p className="text-muted-foreground">
          {m.accountAccess_unlockSubtitle()}
        </p>
      </div>
      {offers.length === 0 ? (
        <p className="text-muted-foreground">
          {m.accountAccess_noOffersText()}
        </p>
      ) : (
        <ul className="space-y-3">
          {offers.map((offer) => (
            <li key={offer.offerKey}>
              <Card size="sm">
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {offer.label}
                      {offer.isDefault ? (
                        <Badge>{m.accountAccess_popularBadge()}</Badge>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {formatPrice(offer.amountCents, offer.currency)} ·{' '}
                      {offer.billingLabel}
                    </div>
                  </div>
                  <Button onClick={() => buy(offer)} disabled={busy !== null}>
                    {busy === offer.offerKey
                      ? m.accountAccess_startingLabel()
                      : m.accountAccess_chooseLabel()}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
