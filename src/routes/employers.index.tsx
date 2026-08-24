import { createFileRoute } from '@tanstack/react-router';

import { getEmployersPage } from '../server/marketing-pages';
import { EmployersPageView } from './-employers.index';

import { jsonLdHeadScripts } from '@/components/json-ld';

export const Route = createFileRoute('/employers/')({
  loader: () => getEmployersPage(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  staticData: { ownsMain: true },
  component: EmployersPage,
});

function EmployersPage() {
  const { plans, salesLed, seo } = Route.useLoaderData();
  return <EmployersPageView plans={plans} salesLed={salesLed} seo={seo} />;
}
