import { boardCopy } from '#/copy';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import { m } from '../paraglide/messages';
import { getSeoBase, listPlans, listSalesLedPlans } from '../server/queries';

import { JsonLd } from '@/components/json-ld';
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

export const Route = createFileRoute('/employers/')({
  loader: async () => {
    const [plans, salesLed, seo] = await Promise.all([
      listPlans({ data: {} }),
      listSalesLedPlans(),
      getSeoBase(),
    ]);
    return { plans: plans.data, salesLed: salesLed.data, seo };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: m.employerLanding_title() },
            {
              name: 'description',
              content: m.employerLanding_subtitle({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            { rel: 'canonical', href: `${loaderData.seo.origin}/employers` },
          ],
        }
      : { meta: [{ title: m.employerLanding_title() }] },
  staticData: { ownsMain: true },
  component: EmployersPage,
});

function formatPrice(price: Plan['price']): string {
  if (!price) return m.employerLanding_freeLabel();
  return new Intl.NumberFormat('en', {
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
    plan.featureSummary.maxActiveJobs === 1
      ? m.employerLanding_featureActiveJobsOne({
          count: plan.featureSummary.maxActiveJobs,
        })
      : m.employerLanding_featureActiveJobsMany({
          count: plan.featureSummary.maxActiveJobs,
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

function PlanCard({ plan }: { plan: Plan }) {
  const actionLabel = plan.invoiceOnly
    ? m.employerLanding_requestInvoiceLabel()
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
        <CardTitle>{plan.name}</CardTitle>
        {plan.description ? (
          <CardDescription>{plan.description}</CardDescription>
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
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              {intervalSuffix(plan.billingInterval)}
            </span>
          ) : null}
        </p>
        <FeatureList features={planFeatures(plan)} />
      </CardContent>
      <CardFooter>
        {plan.purpose === 'job_posting' ? (
          <Link
            to="/post"
            search={{ plan: plan.id }}
            className={actionClassName}
          >
            {actionLabel}
          </Link>
        ) : (
          <Link to="/auth/join" className={actionClassName}>
            {actionLabel}
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

function SalesLedCard({ plan }: { plan: SalesLedPlan }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        {plan.description ? (
          <CardDescription>{plan.description}</CardDescription>
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

function PlanGroup({ title, plans }: { title: string; plans: Plan[] }) {
  if (plans.length === 0) return null;
  return (
    <PageSection title={title}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </PageSection>
  );
}

function EmployersPage() {
  const { plans, salesLed, seo } = Route.useLoaderData();
  const crumbs = boardCopy(seo.language, seo.labels).breadcrumbs;
  const jobPosting = plans.filter((plan) => plan.purpose === 'job_posting');
  const talentAccess = plans.filter((plan) => plan.purpose === 'talent_access');
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: m.breadcrumbJsonLd_forEmployersLabel() },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);
  const empty =
    jobPosting.length === 0 &&
    talentAccess.length === 0 &&
    salesLed.length === 0;

  return (
    <Page width="wide">
      <JsonLd data={jsonLd} />
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
            />
            <PlanGroup
              title={m.employerLanding_talentAccessHeading()}
              plans={talentAccess}
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
