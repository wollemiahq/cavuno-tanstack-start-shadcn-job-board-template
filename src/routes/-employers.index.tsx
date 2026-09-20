import type { ReactElement, ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import { candidatePlanBenefits } from '@/board/candidate-plan-benefits';
import {
  configuredMembershipCapacitySentence,
  planBenefitLines,
} from '@/board/plan-benefits';
import { planDescription, planName } from '@/board/plan-labels';
import {
  Page,
  PageContent,
  PageHeader,
  PageSection,
} from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
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
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import type { Plan } from '@cavuno/board';

export type EmployersPageViewDependencies = {
  postingPlanLink: (input: {
    planId: string;
    className: string;
    children: ReactNode;
  }) => ReactElement;
  joinLink: (input: { className: string; children: ReactNode }) => ReactElement;
  membershipLink?: (input: {
    className: string;
    children: ReactNode;
  }) => ReactElement;
  talentPlanLink?: (input: {
    className: string;
    children: ReactNode;
  }) => ReactElement;
  talentPlanAction?: (input: {
    planId: string;
    planKind: Plan['kind'];
    className: string;
    children: ReactNode;
  }) => ReactElement;
};

const employersPageViewDependencies: EmployersPageViewDependencies = {
  postingPlanLink: ({ planId, className, children }) => (
    <Link to="/post" search={{ plan: planId }} className={className}>
      {children}
    </Link>
  ),
  joinLink: ({ className, children }) => (
    <Link
      to="/auth/join"
      search={{ returnTo: '/employers' }}
      className={className}
    >
      {children}
    </Link>
  ),
  membershipLink: ({ className, children }) => (
    <Link to="/memberships" className={className}>
      {children}
    </Link>
  ),
  talentPlanLink: ({ className, children }) => (
    <Link to="/employers" className={className}>
      {children}
    </Link>
  ),
};

function formatPrice(price: Plan['price']): string {
  if (!price) return m.employerLanding_freeLabel();
  // Chrome-locale figure inside chrome-locale sentences (same rule as the
  // salary FAQ): the price agrees with the copy around it.
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: price.currency.toUpperCase(),
    minimumFractionDigits: price.amountCents % 100 === 0 ? 0 : 2,
  }).format(price.amountCents / 100);
}

const intervalSuffix = (interval: Plan['billingInterval']) =>
  interval === 'month'
    ? m.employerLanding_perMonthSuffix()
    : interval === 'year'
      ? m.employerLanding_perYearSuffix()
      : '';

function planFeatures(plan: Plan) {
  if (plan.purpose === 'job_seeker') return candidatePlanBenefits(plan);
  if (plan.purpose === 'membership') return planBenefitLines(plan);
  const grantsListings =
    plan.purpose !== 'talent_access' && plan.featureSummary.maxActiveJobs > 0;
  return [
    grantsListings
      ? m.employerLanding_featureActiveJobs({
          count: plan.featureSummary.maxActiveJobs,
          countLabel: String(plan.featureSummary.maxActiveJobs),
        })
      : null,
    grantsListings && plan.featureSummary.durationDays > 0
      ? m.employerLanding_featureListingDuration({
          days: plan.featureSummary.durationDays,
        })
      : null,
    grantsListings &&
    plan.features?.['jobs.featured_slots']?.value === 'unlimited'
      ? m.employerCompany_featuredUnlimitedText()
      : grantsListings && plan.featureSummary.featuredSlots > 0
        ? m.employerLanding_featureFeaturedSlots({
            count: plan.featureSummary.featuredSlots,
            countLabel: String(plan.featureSummary.featuredSlots),
          })
        : null,
    plan.talent
      ? m.employerLanding_featureProfileUnlocks({
          count: plan.talent.unlocksPerPeriod,
          countLabel: String(plan.talent.unlocksPerPeriod),
        })
      : null,
    plan.talent
      ? m.employerLanding_featureMessages({
          count: plan.talent.messagesPerPeriod,
          countLabel: String(plan.talent.messagesPerPeriod),
        })
      : null,
  ].filter((feature) => feature !== null);
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="text-muted-foreground space-y-2 text-sm">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2">
          <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The price block. `pricingMode` is the authority, never `price` — a quote-only
 * plan can still carry a zeroed price row, so reading `price` would advertise
 * "Free" for an enterprise tier.
 */
function PlanPrice({ plan }: { plan: Plan }) {
  if (plan.pricingMode === 'contact') {
    return (
      <p className="font-heading text-foreground text-3xl font-semibold tracking-tight">
        {plan.priceText?.trim() || m.memberships_contactPriceFallback()}
      </p>
    );
  }
  return (
    <p className="font-heading text-foreground text-3xl font-semibold tracking-tight">
      {plan.kind === 'free'
        ? m.employerLanding_freeLabel()
        : formatPrice(plan.price)}
      {plan.kind !== 'free' && plan.price ? (
        <span className="text-muted-foreground ms-1 text-sm font-normal">
          {intervalSuffix(plan.billingInterval)}
        </span>
      ) : null}
    </p>
  );
}

function PlanCard({
  plan,
  dependencies,
}: {
  plan: Plan;
  dependencies: EmployersPageViewDependencies;
}) {
  const contact = plan.pricingMode === 'contact';
  const membershipCapacity =
    plan.purpose === 'membership'
      ? configuredMembershipCapacitySentence(plan)
      : null;
  const actionLabel = plan.invoiceOnly
    ? m.employerLanding_requestInvoiceLabel()
    : plan.purpose === 'job_posting'
      ? // A posting plan (free or one-off) is a job post, not a subscription.
        m.siteHeader_postJobLabel()
      : m.employerLanding_subscribeLabel();
  const actionClassName = cn(
    buttonVariants({
      variant: plan.isRecommended ? 'default' : 'outline',
    }),
    'w-full',
  );

  return (
    <Card className={cn('h-full', plan.isRecommended && 'ring-primary ring-2')}>
      <CardHeader>
        <CardTitle>{planName(plan)}</CardTitle>
        {planDescription(plan) ? (
          <CardDescription>{planDescription(plan)}</CardDescription>
        ) : null}
        {plan.isRecommended ? (
          <CardAction>
            <Badge>{m.employerLanding_recommendedBadge()}</Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <PlanPrice plan={plan} />
        <FeatureList
          features={contact ? planBenefitLines(plan) : planFeatures(plan)}
        />
        {membershipCapacity ? (
          <p className="text-foreground text-sm">{membershipCapacity}</p>
        ) : null}
      </CardContent>
      <CardFooter>
        {contact ? (
          // A contact plan whose operator left the destination unset renders no
          // CTA rather than a dead control.
          plan.ctaDestination ? (
            <a
              href={plan.ctaDestination}
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            >
              {plan.ctaText?.trim() || m.memberships_contactCtaFallback()}
            </a>
          ) : null
        ) : plan.purpose === 'job_seeker' ? (
          <Link to="/account/access" className={actionClassName}>
            {m.employerLanding_subscribeLabel()}
          </Link>
        ) : plan.purpose === 'membership' ? (
          (dependencies.membershipLink?.({
            className: actionClassName,
            children: m.memberships_joinLabel(),
          }) ?? null)
        ) : plan.purpose === 'job_posting' ? (
          dependencies.postingPlanLink({
            planId: plan.id,
            className: actionClassName,
            children: actionLabel,
          })
        ) : plan.purpose === 'talent_access' &&
          dependencies.talentPlanAction ? (
          dependencies.talentPlanAction({
            planId: plan.id,
            planKind: plan.kind,
            className: actionClassName,
            children: actionLabel,
          })
        ) : plan.purpose === 'talent_access' ? (
          (dependencies.talentPlanLink?.({
            className: actionClassName,
            children: actionLabel,
          }) ?? null)
        ) : (
          dependencies.joinLink({
            className: actionClassName,
            children: actionLabel,
          })
        )}
      </CardFooter>
    </Card>
  );
}

function PlanGroup({
  title,
  plans,
  dependencies,
}: {
  title: string;
  plans: Plan[];
  dependencies: EmployersPageViewDependencies;
}) {
  if (plans.length === 0) return null;
  return (
    <PageSection title={title}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} dependencies={dependencies} />
        ))}
      </div>
    </PageSection>
  );
}

function CandidateBenefits({ plans }: { plans: Plan[] }) {
  const enabled = new Set(
    plans.flatMap((plan) =>
      Object.entries(plan.features ?? {}).flatMap(([key, feature]) =>
        feature.value === 'true' ? [key] : [],
      ),
    ),
  );
  const cards = [
    enabled.has('job_seeker.matches')
      ? {
          title: m.candidateLanding_matchesTitle(),
          description: m.candidateLanding_matchesDescription(),
        }
      : null,
    enabled.has('job_seeker.job_alerts')
      ? {
          title: m.candidateLanding_alertsTitle(),
          description: m.candidateLanding_alertsDescription(),
        }
      : null,
  ].filter((card) => card !== null);

  if (cards.length === 0) return null;

  return (
    <PageSection title={m.candidateLanding_benefitsTitle()}>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {card.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageSection>
  );
}

export function EmployersPageView({
  plans,
  contactPlans,
  seo,
  dependencies = employersPageViewDependencies,
  billingAction,
  audience = 'employers',
  title,
  description,
  candidateIntro = false,
}: {
  plans: Plan[];
  /**
   * Quote-only employer-service tiers: `plans.list({ purpose:
   * 'employer_service' })` kept to `pricingMode === 'contact'`. The deprecated
   * `plans.salesLed()` read is gone — these are ordinary plans now.
   */
  contactPlans: Plan[];
  seo: { boardName: string };
  dependencies?: EmployersPageViewDependencies;
  /**
   * Stripe billing portal entry. Product-agnostic on purpose: job-posting
   * subscriptions and talent access share ONE Stripe customer and one portal,
   * so this sits on the page header rather than inside the talent-access
   * plan group, where a posting-only subscriber never saw it.
   */
  billingAction?: ReactNode;
  audience?: 'employers' | 'candidates' | 'all';
  title?: string;
  description?: string;
  candidateIntro?: boolean;
}) {
  const candidatePlans = plans.filter((plan) => plan.purpose === 'job_seeker');
  const jobPosting = plans.filter((plan) => plan.purpose === 'job_posting');
  const talentAccess = plans.filter((plan) => plan.purpose === 'talent_access');
  const memberships = plans.filter((plan) => plan.purpose === 'membership');
  const showCandidates = audience !== 'employers';
  const showEmployers = audience !== 'candidates';
  const empty =
    (!showCandidates || candidatePlans.length === 0) &&
    (!showEmployers ||
      (jobPosting.length === 0 &&
        talentAccess.length === 0 &&
        contactPlans.length === 0 &&
        memberships.length === 0));
  const pageDescription =
    description ?? m.employerLanding_subtitle({ boardName: seo.boardName });

  return (
    <Page width="wide">
      <PageContent
        header={
          <PageHeader
            title={title ?? m.employerLanding_title()}
            description={pageDescription}
            actions={
              candidateIntro ? (
                <div className="flex flex-wrap gap-3">
                  <Link to="/jobs" className={buttonVariants()}>
                    {m.candidateLanding_browseAction()}
                  </Link>
                  <Link
                    to="/auth/sign-up"
                    search={{ returnTo: '/account' }}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    {m.candidateLanding_signUpAction()}
                  </Link>
                </div>
              ) : (
                billingAction
              )
            }
          />
        }
      >
        {candidateIntro ? <CandidateBenefits plans={candidatePlans} /> : null}
        {empty ? (
          candidateIntro ? null : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{m.employerLanding_noPlansText()}</EmptyTitle>
                <EmptyDescription>{pageDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        ) : (
          <>
            {showCandidates ? (
              <PlanGroup
                title={m.candidateLanding_plansHeading()}
                plans={candidatePlans}
                dependencies={dependencies}
              />
            ) : null}
            {showEmployers ? (
              <>
                <PlanGroup
                  title={m.employerLanding_jobPostingHeading()}
                  plans={jobPosting}
                  dependencies={dependencies}
                />
                <PlanGroup
                  title={m.employerLanding_talentAccessHeading()}
                  plans={talentAccess}
                  dependencies={dependencies}
                />
                <PlanGroup
                  title={m.employerLanding_enterpriseHeading()}
                  plans={contactPlans}
                  dependencies={dependencies}
                />
                <PlanGroup
                  title={m.memberships_title()}
                  plans={memberships}
                  dependencies={dependencies}
                />
              </>
            ) : null}
          </>
        )}
      </PageContent>
    </Page>
  );
}
