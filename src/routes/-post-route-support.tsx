import type { ReactNode } from 'react';

import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { PostJobForm } from '@/components/post-job-form';
import { m } from '@/paraglide/messages';
import {
  fetchLogoByDomain,
  getPostPlans,
  submitJobPosting,
  uploadLogo,
} from '@/server/post';
import { getRemotePermits, getSeoBase } from '@/server/queries';

export type PostRouteDependencies = {
  fetchLogoByDomain: typeof fetchLogoByDomain;
  getPostPlans: typeof getPostPlans;
  getRemotePermits: typeof getRemotePermits;
  getSeoBase: typeof getSeoBase;
  renderForm: (props: Parameters<typeof PostJobForm>[0]) => ReactNode;
  submitJobPosting: typeof submitJobPosting;
  uploadLogo: typeof uploadLogo;
};

export const postRouteDependencies: PostRouteDependencies = {
  fetchLogoByDomain,
  getPostPlans,
  getRemotePermits,
  getSeoBase,
  renderForm: (props) => <PostJobForm {...props} />,
  submitJobPosting,
  uploadLogo,
};

export function createPostLoader(
  dependencies: PostRouteDependencies = postRouteDependencies,
) {
  return async () => {
    const [plans, remotePermits, seo] = await Promise.all([
      dependencies.getPostPlans(),
      dependencies.getRemotePermits().catch(() => null),
      dependencies.getSeoBase(),
    ]);
    return { plans, remotePermits, seo };
  };
}

export function PostJobPageView({
  plans,
  remotePermits,
  initialPlanId,
  customFields,
  jobForm,
  locale,
  officeLocationSuggestions,
  gate,
  dependencies = postRouteDependencies,
}: {
  plans: Awaited<ReturnType<typeof getPostPlans>>;
  remotePermits: Awaited<ReturnType<typeof getRemotePermits>> | null;
  initialPlanId?: string;
  customFields: Parameters<typeof PostJobForm>[0]['customFields'];
  jobForm?: Parameters<typeof PostJobForm>[0]['jobForm'];
  locale: string;
  officeLocationSuggestions: Parameters<
    typeof PostJobForm
  >[0]['officeLocationSuggestions'];
  /**
   * Stands in for the form on a members-only board. Rendered INSTEAD of the
   * form: a visitor who cannot post must not be walked through a wizard that
   * the board will refuse.
   */
  gate?: ReactNode;
  dependencies?: PostRouteDependencies;
}) {
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
          {gate ??
            dependencies.renderForm({
              locale,
              plans: plans.data,
              officeLocationSuggestions,
              customFields,
              jobForm,
              remotePermits: remotePermits?.data ?? null,
              initialPlanId,
              onSubmit: (input) =>
                dependencies.submitJobPosting({ data: input }),
              onLogoFetch: (domain) =>
                dependencies.fetchLogoByDomain({ data: { domain } }),
              onLogoUpload: (data) => dependencies.uploadLogo({ data }),
              onCheckout: (url) => {
                window.location.href = url;
              },
            })}
        </div>
      </PageContent>
    </Page>
  );
}
