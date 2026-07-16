import { createFileRoute } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import {
  fetchLogoByDomain,
  getPostPlans,
  submitJobPosting,
  uploadLogo,
} from '../server/post';

import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { PostJobForm } from '@/components/post-job-form';

export const Route = createFileRoute('/post')({
  staticData: { ownsMain: true },
  validateSearch: (search: Record<string, unknown>): { plan?: string } => ({
    plan:
      typeof search.plan === 'string' && search.plan.trim()
        ? search.plan
        : undefined,
  }),
  head: () => ({ meta: [{ title: m.postJob_title() }] }),
  loader: () => getPostPlans(),
  component: PostJobPage,
});

function PostJobPage() {
  const plans = Route.useLoaderData();
  const search = Route.useSearch();

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
