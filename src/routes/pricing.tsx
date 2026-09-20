import { createFileRoute } from '@tanstack/react-router';

import { EmployersPageView } from './-employers.index';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { m } from '@/paraglide/messages';
import { getPricingPage } from '@/server/marketing-pages';

export const Route = createFileRoute('/pricing')({
  loader: () => getPricingPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  staticData: { ownsMain: true },
  component: PricingPage,
});

function PricingPage() {
  const { plans, contactPlans, seo } = Route.useLoaderData();
  return (
    <EmployersPageView
      plans={plans}
      contactPlans={contactPlans}
      seo={seo}
      audience="all"
      title={m.pricing_title()}
      description={m.pricing_description()}
    />
  );
}
