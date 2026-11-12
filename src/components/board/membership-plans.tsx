/**
 * A board's membership plans as cards a visitor can join from, and the
 * checkout that joining opens. Shared by `/memberships` and the members-only
 * posting gate, so a membership is sold the same way wherever the board asks
 * for one.
 */
import { useCallback, useEffect, useState } from 'react';

import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import {
  configuredMembershipCapacitySentence,
  planBenefitLines,
} from '@/board/plan-benefits';
import { planDescription, planName } from '@/board/plan-labels';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { boardErrorMessage } from '@/lib/board-error-message';
import { cn } from '@/lib/utils';
import type { MembershipCheckoutResult } from '@/server/membership-checkout';
import type {
  MembershipCheckoutSession,
  MembershipCheckoutSessionState,
  Plan,
} from '@cavuno/board';

export type MembershipsViewer =
  | { kind: 'anonymous' }
  /**
   * A signed-in viewer with the companies they approved-manage. A membership
   * is bought for (and granted to) a company, never a person, so a viewer
   * with no approved company cannot buy one yet.
   */
  | { kind: 'signed-in'; companies: MembershipCompanyOption[] };

export type MembershipCompanyOption = { slug: string; name: string };

/** Starts checkout for one plan and one of the viewer's companies. */
export type StartMembershipCheckout = (input: {
  data: { companySlug: string; planId: string; returnPath: string };
}) => Promise<MembershipCheckoutResult<MembershipCheckoutSession>>;

export type GetMembershipCheckoutState = (input: {
  data: { companySlug: string; sessionId: string };
}) => Promise<MembershipCheckoutSessionState & { membershipActive?: boolean }>;

export const MEMBERSHIPS_PATH = '/memberships';

/**
 * `/memberships` for one company, remembering where the buyer was headed — the
 * job they were about to post — through sign-in and Stripe's return redirect.
 */
export function membershipsHref({
  companySlug = null,
  continueTo = null,
}: {
  companySlug?: string | null;
  continueTo?: string | null;
}): string {
  const params = new URLSearchParams();
  if (companySlug) params.set('company', companySlug);
  if (continueTo) params.set('returnTo', continueTo);
  const query = params.toString();
  return query ? `${MEMBERSHIPS_PATH}?${query}` : MEMBERSHIPS_PATH;
}

/** Stripe Checkout can carry a priced subscription or one-time plan; nothing else. */
function canCheckout(plan: Plan): boolean {
  return (
    plan.pricingMode !== 'contact' &&
    plan.price !== null &&
    (plan.kind === 'subscription' || plan.kind === 'one_time')
  );
}

function priceLabel(plan: Plan): string {
  if (plan.pricingMode === 'contact') {
    return plan.priceText?.trim() || m.memberships_contactPriceFallback();
  }
  if (plan.kind === 'free' || !plan.price) {
    return m.employerLanding_freeLabel();
  }
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: plan.price.currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(plan.price.amountCents / 100);
}

function intervalSuffix(plan: Plan): string {
  if (plan.pricingMode === 'contact' || !plan.price) return '';
  if (plan.billingInterval === 'month') {
    return m.employerLanding_perMonthSuffix();
  }
  if (plan.billingInterval === 'year') return m.employerLanding_perYearSuffix();
  return '';
}

function BenefitList({ lines }: { lines: string[] }) {
  return (
    <ul className="text-muted-foreground space-y-2 text-sm">
      {lines.map((line) => (
        <li key={line} className="flex items-start gap-2">
          <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The Join control.
 *
 * A quote-only plan links the operator's own CTA. A priced plan starts the
 * Board API's membership checkout for one of the viewer's approved companies
 * (a picker when they manage more than one); a signed-out visitor is sent to
 * sign-in with a return path, and a signed-in one with no approved company to
 * the employer dashboard to connect one. A free plan is assigned by the board
 * team, so it keeps the dashboard link and says so.
 */
function JoinAction({
  plan,
  viewer,
  busy,
  onJoin,
  preferredCompanySlug,
  signInReturnTo,
}: {
  plan: Plan;
  viewer: MembershipsViewer;
  busy: boolean;
  onJoin: (companySlug: string) => void;
  /** The company the buyer came to join for, chosen when they manage it. */
  preferredCompanySlug: string | null;
  signInReturnTo: string;
}) {
  const className = cn(
    buttonVariants({ variant: plan.isRecommended ? 'default' : 'outline' }),
    'w-full',
  );
  // The viewer is anonymous on the first render — the session hydrates after
  // mount — so seeding this from `viewer` with `useState` captured '' and never
  // re-ran, leaving `disabled={!companySlug}` stuck on. With one company there
  // is no <select> to set it either, so a single-company employer could never
  // buy (live gate, 2026-09-05). Hold only the explicit choice and fall back to
  // the first company, which follows `viewer` as it hydrates.
  const [chosenSlug, setChosenSlug] = useState(preferredCompanySlug ?? '');
  const companies = viewer.kind === 'signed-in' ? viewer.companies : [];
  const companySlug =
    companies.find((company) => company.slug === chosenSlug)?.slug ??
    companies[0]?.slug ??
    '';

  if (plan.pricingMode === 'contact') {
    if (!plan.ctaDestination) return null;
    return (
      <a href={plan.ctaDestination} className={className}>
        {plan.ctaText?.trim() || m.memberships_contactCtaFallback()}
      </a>
    );
  }

  if (viewer.kind === 'anonymous') {
    return (
      <Link
        to="/auth/sign-in"
        search={{ returnTo: signInReturnTo }}
        className={className}
      >
        {m.memberships_joinLabel()}
      </Link>
    );
  }

  if (!canCheckout(plan)) {
    return (
      <div className="w-full space-y-2">
        <Link to="/employers/dashboard" className={className}>
          {m.memberships_joinLabel()}
        </Link>
        <p className="text-muted-foreground text-xs">
          {m.memberships_joinDashboardText()}
        </p>
      </div>
    );
  }

  if (viewer.companies.length === 0) {
    return (
      <div className="w-full space-y-2">
        <Link to="/employers/dashboard" className={className}>
          {m.memberships_joinLabel()}
        </Link>
        <p className="text-muted-foreground text-xs">
          {m.memberships_connectCompanyText()}
        </p>
      </div>
    );
  }

  const selectId = `membership-company-${plan.id}`;
  return (
    <div className="w-full space-y-3">
      {viewer.companies.length > 1 ? (
        <div className="space-y-1.5">
          <Label htmlFor={selectId}>{m.memberships_chooseCompanyLabel()}</Label>
          <NativeSelect
            id={selectId}
            value={companySlug}
            onChange={(event) => setChosenSlug(event.target.value)}
          >
            {viewer.companies.map((company) => (
              <NativeSelectOption key={company.slug} value={company.slug}>
                {company.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <Button
        type="button"
        variant={plan.isRecommended ? 'default' : 'outline'}
        className="w-full"
        disabled={busy || !companySlug}
        onClick={() => onJoin(companySlug)}
      >
        {m.memberships_joinLabel()}
      </Button>
    </div>
  );
}

export function MembershipPlanCard({
  plan,
  viewer,
  busy,
  onJoin,
  preferredCompanySlug,
  signInReturnTo,
}: {
  plan: Plan;
  viewer: MembershipsViewer;
  busy: boolean;
  onJoin: (companySlug: string) => void;
  preferredCompanySlug: string | null;
  signInReturnTo: string;
}) {
  const description = planDescription(plan);
  const capacity = configuredMembershipCapacitySentence(plan);
  return (
    <Card className={cn('h-full', plan.isRecommended && 'ring-primary ring-2')}>
      <CardHeader>
        <CardTitle>{planName(plan)}</CardTitle>
        {description ? (
          <CardDescription className="whitespace-pre-line">
            {description}
          </CardDescription>
        ) : null}
        {plan.isRecommended ? (
          <CardAction>
            <Badge>{m.employerLanding_recommendedBadge()}</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <p className="font-heading text-foreground text-3xl font-semibold tracking-tight">
          {priceLabel(plan)}
          {intervalSuffix(plan) ? (
            <span className="text-muted-foreground ms-1 text-sm font-normal">
              {intervalSuffix(plan)}
            </span>
          ) : null}
        </p>
        {capacity ? (
          <p className="text-foreground text-sm">{capacity}</p>
        ) : null}
        <BenefitList lines={planBenefitLines(plan)} />
      </CardContent>
      <CardFooter>
        <JoinAction
          plan={plan}
          viewer={viewer}
          busy={busy}
          onJoin={onJoin}
          preferredCompanySlug={preferredCompanySlug}
          signInReturnTo={signInReturnTo}
        />
      </CardFooter>
    </Card>
  );
}

/**
 * Joining a membership: start checkout for one plan and company, then, once
 * the payment finishes (in place, or through Stripe's return redirect), poll
 * the session until the membership is active and re-read the page. The grant
 * lands by webhook, so a still-`open` session is just "not yet".
 */
export function useMembershipCheckout({
  startCheckoutAction,
  getCheckoutStateAction,
  invalidate,
  returning = null,
  continueTo = null,
}: {
  startCheckoutAction?: StartMembershipCheckout;
  getCheckoutStateAction?: GetMembershipCheckoutState;
  invalidate?: () => Promise<void>;
  /** Set when Stripe sent the buyer back with a session to confirm. */
  returning?: { sessionId: string; companySlug: string } | null;
  /**
   * Where the buyer was headed when the board asked for a membership. A
   * payment method that needs a redirect returns through `/memberships`,
   * which offers it as the next step.
   */
  continueTo?: string | null;
}) {
  // The open checkout and the company it buys for, so a card payment that
  // completes in place can poll the same seat a return redirect would.
  const [checkout, setCheckout] = useState<{
    kit: MembershipCheckoutSession;
    companySlug: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set by Stripe's return redirect, or by `onComplete` when the payment
  // finished on this page.
  const [confirming, setConfirming] = useState(returning);
  const [polling, setPolling] = useState(Boolean(returning));
  const [confirmed, setConfirmed] = useState(false);
  const [paymentState, setPaymentState] = useState<
    'processing' | 'failed' | null
  >(null);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    if (!polling || !confirming || !getCheckoutStateAction) return;
    let stop = false;
    let attempts = 0;
    let timerId: number;
    const tick = async () => {
      attempts += 1;
      let state: MembershipCheckoutSessionState & {
        membershipActive?: boolean;
      };
      try {
        state = await getCheckoutStateAction({ data: confirming });
      } catch {
        if (stop) return;
        setPolling(false);
        setExhausted(true);
        return;
      }
      if (stop) return;
      if (
        state.paymentStatus === 'processing' ||
        state.paymentStatus === 'failed'
      ) {
        setPaymentState(state.paymentStatus);
        setPolling(false);
      } else if (state.status === 'complete' && state.membershipActive) {
        setConfirmed(true);
        setPolling(false);
        void invalidate?.().catch(() => undefined);
      } else if (state.status === 'expired' || attempts >= 30) {
        setPolling(false);
        setExhausted(true);
      } else {
        timerId = window.setTimeout(tick, 2000);
      }
    };
    timerId = window.setTimeout(tick, 1000);
    return () => {
      stop = true;
      window.clearTimeout(timerId);
    };
  }, [confirming, getCheckoutStateAction, invalidate, polling]);

  const checkoutSessionId = checkout?.kit.sessionId;
  const checkoutCompanySlug = checkout?.companySlug;
  const handleCheckoutComplete = useCallback(() => {
    // A card payment completes in place (the checkout asks Stripe to redirect
    // only when a payment method needs it): confirm it here, as the return
    // redirect would.
    if (checkoutSessionId && checkoutCompanySlug) {
      setConfirming({
        sessionId: checkoutSessionId,
        companySlug: checkoutCompanySlug,
      });
      setPolling(true);
    }
    setCheckout(null);
  }, [checkoutCompanySlug, checkoutSessionId]);

  async function join(plan: Plan, companySlug: string) {
    if (!startCheckoutAction) return;
    setBusy(plan.id);
    setError(null);
    try {
      const result = await startCheckoutAction({
        data: {
          companySlug,
          planId: plan.id,
          returnPath: membershipsHref({ companySlug, continueTo }),
        },
      });
      if (result.ok) setCheckout({ kit: result.data, companySlug });
      else setError(boardErrorMessage(result));
    } catch {
      setError(boardErrorMessage({}));
    } finally {
      setBusy(null);
    }
  }

  return {
    kit: checkout?.kit ?? null,
    busy,
    error,
    polling,
    confirmed,
    paymentState,
    exhausted,
    join,
    handleCheckoutComplete,
    closeCheckout: () => setCheckout(null),
    /** After "processing", check again; after "failed", back to the plans. */
    acknowledgePaymentState: () => {
      setPaymentState(null);
      if (paymentState === 'processing') setPolling(true);
    },
    acknowledgeExhausted: () => {
      setExhausted(false);
      void invalidate?.().catch(() => undefined);
    },
  };
}
