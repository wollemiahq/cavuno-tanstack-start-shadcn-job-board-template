/**
 * `/memberships` — the board's membership plans and, for each, the companies
 * that hold one. A membership is public identity, so the roster is part of the
 * page rather than a signed-in view.
 *
 * View only. The loader lives in `-memberships-loader.ts`: TanStack splits the
 * route COMPONENT but keeps loaders in the critical graph, so a route file that
 * imported its loader from here would drag this whole UI graph into the shared
 * shell.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { Check, Clock } from 'lucide-react';

import { EmbeddedCheckout } from '../components/paywall/embedded-checkout';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import {
  membershipCapacitySentence,
  planBenefitLines,
} from '@/board/plan-benefits';
import { planDescription, planName } from '@/board/plan-labels';
import { CompanyCard } from '@/components/board/company-card';
import { EmptyState } from '@/components/empty-state';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { Text } from '@/components/text';
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { boardErrorMessage } from '@/lib/board-error-message';
import { cn } from '@/lib/utils';
import type { MembershipCheckoutResult } from '@/server/membership-checkout';
import type {
  listMembershipCompanies,
  MembershipRoster,
} from '@/server/membership-pages';
import type {
  MembershipCheckoutSession,
  MembershipCheckoutSessionState,
  Plan,
  PublicCompany,
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
}) => Promise<MembershipCheckoutSessionState>;

export const MEMBERSHIPS_PATH = '/memberships';

/** Stripe Checkout can carry a priced subscription or one-time plan; nothing else. */
function canCheckout(plan: Plan): boolean {
  return (
    plan.pricingMode !== 'contact' &&
    plan.price !== null &&
    (plan.kind === 'subscription' || plan.kind === 'one_time')
  );
}

/** The "show more members" read, as the view consumes it. */
export type LoadMoreMembers = (input: {
  data: { planId: string; offset: number };
}) => Promise<Awaited<ReturnType<typeof listMembershipCompanies>>>;

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
}: {
  plan: Plan;
  viewer: MembershipsViewer;
  busy: boolean;
  onJoin: (companySlug: string) => void;
}) {
  const className = cn(
    buttonVariants({ variant: plan.isRecommended ? 'default' : 'outline' }),
    'w-full',
  );
  const [companySlug, setCompanySlug] = useState(
    viewer.kind === 'signed-in' ? (viewer.companies[0]?.slug ?? '') : '',
  );

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
        search={{ returnTo: MEMBERSHIPS_PATH }}
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
            onChange={(event) => setCompanySlug(event.target.value)}
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

function MembershipPlanCard({
  plan,
  viewer,
  busy,
  onJoin,
}: {
  plan: Plan;
  viewer: MembershipsViewer;
  busy: boolean;
  onJoin: (companySlug: string) => void;
}) {
  const description = planDescription(plan);
  return (
    <Card className={cn('h-full', plan.isRecommended && 'ring-primary ring-2')}>
      <CardHeader>
        <CardTitle>{planName(plan)}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
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
        <p className="text-foreground text-sm">
          {membershipCapacitySentence(plan)}
        </p>
        <BenefitList lines={planBenefitLines(plan)} />
      </CardContent>
      <CardFooter>
        <JoinAction plan={plan} viewer={viewer} busy={busy} onJoin={onJoin} />
      </CardFooter>
    </Card>
  );
}

function jobCountLabel(count: number): string {
  return m.companyDetail_openJobsCount({
    count,
    countLabel: count.toLocaleString(getLocale()),
  });
}

/**
 * The plan's member roster. `count` from the scoped company read describes the
 * MEMBERS, not the board, so it is honest as the section's count. A plan with
 * no members renders nothing.
 */
function MemberRoster({
  roster,
  loadMore,
}: {
  roster: MembershipRoster;
  loadMore: (offset: number) => Promise<PublicCompany[]>;
}) {
  const [extra, setExtra] = useState<PublicCompany[]>([]);
  const [busy, setBusy] = useState(false);
  const companies = [...roster.companies, ...extra];
  if (companies.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <Text as="h3" variant="heading4">
          {m.memberships_membersHeading()}
        </Text>
        <span className="text-muted-foreground text-sm">
          {m.memberships_memberCount({
            count: roster.count,
            countLabel: roster.count.toLocaleString(getLocale()),
          })}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            companySlug={company.slug}
            name={company.name}
            logoUrl={company.logoUrl}
            summary={company.summary}
            publishedJobCount={company.publishedJobCount}
            jobCountLabel={jobCountLabel(company.publishedJobCount)}
            membershipPlanName={company.membership?.planName ?? null}
          />
        ))}
      </div>
      {companies.length < roster.count ? (
        <div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void loadMore(companies.length)
                .then((next) => setExtra((rows) => [...rows, ...next]))
                .finally(() => setBusy(false));
            }}
          >
            {m.memberships_loadMoreLabel()}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function MembershipsPageView({
  plans,
  rosters,
  seo,
  viewer,
  loadMoreMembers,
  startCheckoutAction,
  getCheckoutStateAction,
  invalidate,
  returning = null,
}: {
  plans: Plan[];
  rosters: MembershipRoster[];
  seo: { boardName: string };
  viewer: MembershipsViewer;
  loadMoreMembers: LoadMoreMembers;
  startCheckoutAction?: StartMembershipCheckout;
  getCheckoutStateAction?: GetMembershipCheckoutState;
  invalidate?: () => Promise<void>;
  /** Set when Stripe sent the buyer back with a session to confirm. */
  returning?: { sessionId: string; companySlug: string } | null;
}): ReactNode {
  const [kit, setKit] = useState<MembershipCheckoutSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(Boolean(returning));
  const [confirmed, setConfirmed] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  // After Stripe's return redirect: poll the session until it is `complete`,
  // then re-read the page so the roster shows the new member. The grant
  // itself lands by webhook, so a still-`open` session is just "not yet".
  useEffect(() => {
    if (!polling || !returning || !getCheckoutStateAction) return;
    let stop = false;
    let attempts = 0;
    let timerId: number;
    const tick = async () => {
      attempts += 1;
      let state: MembershipCheckoutSessionState;
      try {
        state = await getCheckoutStateAction({ data: returning });
      } catch {
        if (stop) return;
        setPolling(false);
        setExhausted(true);
        return;
      }
      if (stop) return;
      if (state.status === 'complete') {
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
  }, [getCheckoutStateAction, invalidate, polling, returning]);

  const handleCheckoutComplete = useCallback(() => {
    // Stripe redirects to `return_url` itself; nothing to do here beyond
    // hiding the form if the redirect is slow.
    setKit(null);
  }, []);

  async function join(plan: Plan, companySlug: string) {
    if (!startCheckoutAction) return;
    setBusy(plan.id);
    setError(null);
    try {
      const result = await startCheckoutAction({
        data: {
          companySlug,
          planId: plan.id,
          returnPath: `${MEMBERSHIPS_PATH}?company=${encodeURIComponent(companySlug)}`,
        },
      });
      if (result.ok) setKit(result.data);
      else setError(boardErrorMessage(result));
    } catch {
      setError(boardErrorMessage({}));
    } finally {
      setBusy(null);
    }
  }

  if (kit) {
    return (
      <Page width="wide">
        <PageContent
          header={
            <PageHeader
              title={m.employerLanding_completePurchaseTitle()}
              description={m.memberships_completePurchaseSubtitle()}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setKit(null)}
                >
                  {m.employerLanding_backToPlansLabel()}
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

  if (polling) {
    return (
      <Page width="content">
        <PageContent header={<PageHeader title={m.memberships_title()} />}>
          <Empty className="min-h-80 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Spinner className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{m.employerLanding_confirmingText()}</EmptyTitle>
              <EmptyDescription>
                {m.employerLanding_confirmingSubtitle()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </PageContent>
      </Page>
    );
  }

  if (exhausted) {
    return (
      <Page width="content">
        <PageContent>
          <EmptyState
            icon={<Clock aria-hidden="true" />}
            title={m.employerLanding_paymentReceivedTitle()}
            description={m.employerLanding_paymentReceivedBody()}
            action={
              <Button
                onClick={() => {
                  setExhausted(false);
                  void invalidate?.().catch(() => undefined);
                }}
              >
                {m.employerLanding_backToPlansLabel()}
              </Button>
            }
          />
        </PageContent>
      </Page>
    );
  }

  return (
    <Page width="wide">
      <PageContent
        header={
          <PageHeader
            title={m.memberships_title()}
            description={m.memberships_subtitle({ boardName: seo.boardName })}
          />
        }
      >
        {confirmed ? (
          <p role="status" className="text-foreground text-sm font-medium">
            {m.memberships_confirmedText()}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        {plans.map((plan) => {
          const roster = rosters.find((entry) => entry.planId === plan.id);
          return (
            <section
              key={plan.id}
              aria-label={planName(plan)}
              className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
            >
              <MembershipPlanCard
                plan={plan}
                viewer={viewer}
                busy={busy === plan.id}
                onJoin={(companySlug) => void join(plan, companySlug)}
              />
              {roster ? (
                <MemberRoster
                  roster={roster}
                  loadMore={async (offset) => {
                    const next = await loadMoreMembers({
                      data: { planId: plan.id, offset },
                    });
                    return next.companies;
                  }}
                />
              ) : null}
            </section>
          );
        })}
      </PageContent>
    </Page>
  );
}
