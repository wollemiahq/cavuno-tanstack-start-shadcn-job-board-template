import type { ReactElement, ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';

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
import type { Plan, SalesLedPlan } from '@cavuno/board';

export type EmployersPageViewDependencies = {
  postingPlanLink: (input: {
    planId: string;
    className: string;
    children: ReactNode;
  }) => ReactElement;
  joinLink: (input: { className: string; children: ReactNode }) => ReactElement;
};

const employersPageViewDependencies: EmployersPageViewDependencies = {
  postingPlanLink: ({ planId, className, children }) => (
    <Link to="/post" search={{ plan: planId }} className={className}>
      {children}
    </Link>
  ),
  joinLink: ({ className, children }) => (
    <Link to="/auth/join" className={className}>
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
        })
      : null,
    plan.talent
      ? m.employerLanding_featureProfileUnlocks({
          count: plan.talent.unlocksPerPeriod,
        })
      : null,
    plan.talent
      ? m.employerLanding_featureMessages({
          count: plan.talent.messagesPerPeriod,
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

function PlanCard({
  plan,
  dependencies,
}: {
  plan: Plan;
  dependencies: EmployersPageViewDependencies;
}) {
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
        <FeatureList features={planFeatures(plan)} />
      </CardContent>
      <CardFooter>
        {plan.purpose === 'job_posting'
          ? dependencies.postingPlanLink({
              planId: plan.id,
              className: actionClassName,
              children: actionLabel,
            })
          : dependencies.joinLink({
              className: actionClassName,
              children: actionLabel,
            })}
      </CardFooter>
    </Card>
  );
}

function SalesLedCard({ plan }: { plan: SalesLedPlan }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{planName(plan)}</CardTitle>
        {planDescription(plan) ? (
          <CardDescription>{planDescription(plan)}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <p className="font-heading text-foreground text-3xl font-semibold tracking-tight">
          {plan.priceText}
        </p>
        <FeatureList features={plan.featuredBullets} />
      </CardContent>
      <CardFooter>
        <a
          href={plan.ctaDestination}
          className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
        >
          {plan.ctaText}
        </a>
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

export function EmployersPageView({
  plans,
  salesLed,
  seo,
  dependencies = employersPageViewDependencies,
}: {
  plans: Plan[];
  salesLed: SalesLedPlan[];
  seo: { boardName: string };
  dependencies?: EmployersPageViewDependencies;
}) {
  const jobPosting = plans.filter((plan) => plan.purpose === 'job_posting');
  const talentAccess = plans.filter((plan) => plan.purpose === 'talent_access');
  const empty =
    jobPosting.length === 0 &&
    talentAccess.length === 0 &&
    salesLed.length === 0;

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
            />
            {salesLed.length > 0 ? (
              <PageSection title={m.employerLanding_enterpriseHeading()}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {salesLed.map((plan) => (
                    <SalesLedCard key={plan.id} plan={plan} />
                  ))}
                </div>
              </PageSection>
            ) : null}
          </>
        )}
      </PageContent>
    </Page>
  );
}
