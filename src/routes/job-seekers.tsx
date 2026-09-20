import { createFileRoute, redirect } from '@tanstack/react-router';

import { EmployersPageView } from './-employers.index';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { hasPaidCandidatePlans } from '@/lib/candidate-pricing';
import { m } from '@/paraglide/messages';
import { getJobSeekersPage } from '@/server/marketing-pages';

export const Route = createFileRoute('/job-seekers')({
  loader: async () => {
    const data = await getJobSeekersPage();
    if (!hasPaidCandidatePlans(data.plans))
      throw redirect({ to: '/jobs', replace: true });
    return data;
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  staticData: { ownsMain: true },
  component: JobSeekersPage,
});

function JobSeekersPage() {
  const { plans, contactPlans, seo } = Route.useLoaderData();
  return (
    <EmployersPageView
      plans={plans}
      contactPlans={contactPlans}
      seo={seo}
      audience="candidates"
      title={m.candidateLanding_title()}
      description={m.candidateLanding_description()}
      candidateIntro
    />
  );
}
