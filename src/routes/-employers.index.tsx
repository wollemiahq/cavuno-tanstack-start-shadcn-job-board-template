import type { ReactElement, ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

import { planBenefitLines } from '@/board/plan-benefits';
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
  talentPlanAction?: (input: {
    planId: string;
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
};

function formatPrice(price: Plan['price']): string {
  if (!price) return m.employerLanding_freeLabel();
  // Chrome-locale figure inside chrome-locale sentences (same rule as the
  // salary FAQ): the price agrees with the copy around it.
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: price.currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(price.amountCents / 100);
}

const intervalSuffix = (interval: Plan['billingInterval']) =>
  interval === 'month'
    ? m.employerLanding_perMonthSuffix()
    : interval === 'year'
      ? m.employerLanding_perYearSuffix()
      : '';

function planFeatures(plan: Plan) {
  return [
    m.employerLanding_featureActiveJobs({
      count: plan.featureSummary.maxActiveJobs,
      countLabel: String(plan.featureSummary.maxActiveJobs),
    }),
    m.employerLanding_featureListingDuration({
      days: plan.featureSummary.durationDays,
    }),
    plan.featureSummary.featuredSlots > 0
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
            className: actionClassName,
            children: actionLabel,
          })
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
  action,
}: {
  title: string;
  plans: Plan[];
  dependencies: EmployersPageViewDependencies;
  action?: ReactNode;
}) {
  if (plans.length === 0) return null;
  return (
    <PageSection title={title} actions={action}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} dependencies={dependencies} />
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
  talentSectionAction,
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
  talentSectionAction?: ReactNode;
}) {
  const jobPosting = plans.filter((plan) => plan.purpose === 'job_posting');
  const talentAccess = plans.filter((plan) => plan.purpose === 'talent_access');
  const empty =
    jobPosting.length === 0 &&
    talentAccess.length === 0 &&
    contactPlans.length === 0;

  return (
    <Page width="wide">
      <PageContent
        header={
          <PageHeader
            title={m.employerLanding_title()}
            description={m.employerLanding_subtitle({
              boardName: seo.boardName,
            })}
          />
        }
      >
        {empty ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m.employerLanding_noPlansText()}</EmptyTitle>
              <EmptyDescription>
                {m.employerLanding_subtitle({ boardName: seo.boardName })}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
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
              action={talentSectionAction}
            />
            <PlanGroup
              title={m.employerLanding_enterpriseHeading()}
              plans={contactPlans}
              dependencies={dependencies}
            />
          </>
        )}
      </PageContent>
    </Page>
  );
}
