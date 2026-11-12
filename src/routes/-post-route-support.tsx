import type { ReactNode } from 'react';

import type { JoinHeading } from '@/components/board/membership-post-gate';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { PostJobForm } from '@/components/post-job-form';
import { m } from '@/paraglide/messages';
import { getPostingMembershipPlans } from '@/server/membership-pages';
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
  getPostingMembershipPlans: typeof getPostingMembershipPlans;
  getRemotePermits: typeof getRemotePermits;
  getSeoBase: typeof getSeoBase;
  renderForm: (props: Parameters<typeof PostJobForm>[0]) => ReactNode;
  submitJobPosting: typeof submitJobPosting;
  uploadLogo: typeof uploadLogo;
};

export const postRouteDependencies: PostRouteDependencies = {
  fetchLogoByDomain,
  getPostPlans,
  getPostingMembershipPlans,
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
    const [plans, membershipPlans, remotePermits, seo] = await Promise.all([
      dependencies.getPostPlans(),
      // What the members-only gate sells. Empty on an open board; a failed
      // read leaves the gate linking to /memberships instead.
      dependencies.getPostingMembershipPlans().catch(() => []),
      dependencies.getRemotePermits().catch(() => null),
      dependencies.getSeoBase(),
    ]);
    return { plans, membershipPlans, remotePermits, seo };
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
  heading,
  contact = null,
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
  /**
   * Replaces "Post a job" while the gate sells memberships, so the page has
   * one heading about joining instead of two stacked titles.
   */
  heading?: JoinHeading;
  /** How to reach the board when it takes no job posts. */
  contact?: Parameters<typeof PostJobForm>[0]['contact'];
  dependencies?: PostRouteDependencies;
}) {
  return (
    <Page width="content">
      <PageContent
        header={
          <PageHeader
            title={heading?.title ?? m.postJob_title()}
            // "Choose a plan and submit below" describes the form, which the
            // gate replaces.
            description={
              heading?.description ?? (gate ? undefined : m.postJob_subtitle())
            }
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
              contact,
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
