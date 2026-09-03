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
import { useState, type ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import {
  membershipCapacitySentence,
  planBenefitLines,
} from '@/board/plan-benefits';
import { planDescription, planName } from '@/board/plan-labels';
import { CompanyCard } from '@/components/board/company-card';
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
import { cn } from '@/lib/utils';
import type {
  listMembershipCompanies,
  MembershipRoster,
} from '@/server/membership-pages';
import type { Plan, PublicCompany } from '@cavuno/board';

export type MembershipsViewer =
  | { kind: 'anonymous' }
  /** Any signed-in viewer — a membership is granted to a company, not a person. */
  | { kind: 'signed-in' };

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
 * A quote-only plan links the operator's own CTA. A priced plan has NO
 * self-serve membership checkout in the Board API (there is no
 * `me.companies.membership.checkout`), so a signed-out visitor is sent to
 * sign-in with a return path and a signed-in one to the employer dashboard,
 * with a line saying who grants the membership.
 */
function JoinAction({
  plan,
  viewer,
}: {
  plan: Plan;
  viewer: MembershipsViewer;
}) {
  const className = cn(
    buttonVariants({ variant: plan.isRecommended ? 'default' : 'outline' }),
    'w-full',
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
        search={{ returnTo: '/memberships' }}
        className={className}
      >
        {m.memberships_joinLabel()}
      </Link>
    );
  }

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

function MembershipPlanCard({
  plan,
  viewer,
}: {
  plan: Plan;
  viewer: MembershipsViewer;
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
        <JoinAction plan={plan} viewer={viewer} />
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
}: {
  plans: Plan[];
  rosters: MembershipRoster[];
  seo: { boardName: string };
  viewer: MembershipsViewer;
  loadMoreMembers: LoadMoreMembers;
}): ReactNode {
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
        {plans.map((plan) => {
          const roster = rosters.find((entry) => entry.planId === plan.id);
          return (
            <section
              key={plan.id}
              aria-label={planName(plan)}
              className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
            >
              <MembershipPlanCard plan={plan} viewer={viewer} />
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
