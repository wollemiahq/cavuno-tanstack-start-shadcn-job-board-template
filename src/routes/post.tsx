import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import {
  fetchLogoByDomain,
  getPostPlans,
  submitJobPosting,
  uploadLogo,
} from '../server/post';
import { getSeoBase, getRemotePermits } from '../server/queries';
import { useLocationSuggestions } from './-use-location-suggestions';

import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { PostJobForm } from '@/components/post-job-form';
import { headTitle } from '@/lib/page-title';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/post')({
  staticData: { ownsMain: true },
  validateSearch: (search: Record<string, unknown>): { plan?: string } => ({
    plan:
      typeof search.plan === 'string' && search.plan.trim()
        ? search.plan
        : undefined,
  }),
  head: ({ loaderData }) => ({
    meta: [{ title: headTitle(loaderData?.seo.boardName, m.postJob_title()) }],
  }),
  loader: async () => {
    const [plans, remotePermits, seo] = await Promise.all([
      getPostPlans(),
      // The geographic-restriction option space. Optional enhancement — an
      // unavailable taxonomy must not take the posting form down (the scope
      // control degrades to worldwide/countries).
      getRemotePermits().catch(() => null),
      getSeoBase(),
    ]);
    return { plans, remotePermits, seo };
  },
  component: PostJobPage,
});

function PostJobPage() {
  const { plans, remotePermits } = Route.useLoaderData();
  const search = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const officeLocationSuggestions = useLocationSuggestions(getLocale());

  return (
    <Page width="content">
      <PageContent
        header={
          <PageHeader
            title={m.postJob_title()}
            description={m.postJob_subtitle()}
          />
        }
      >
        <div>
          <PostJobForm
            locale={getLocale()}
            plans={plans.data}
            officeLocationSuggestions={officeLocationSuggestions}
            customFields={board.customFields.job}
            remotePermits={remotePermits?.data ?? null}
            initialPlanId={search.plan}
            onSubmit={(input) => submitJobPosting({ data: input })}
            onLogoFetch={(domain) => fetchLogoByDomain({ data: { domain } })}
            onLogoUpload={(data) => uploadLogo({ data })}
            onCheckout={(url) => {
              window.location.href = url;
            }}
          />
        </div>
      </PageContent>
    </Page>
  );
}
