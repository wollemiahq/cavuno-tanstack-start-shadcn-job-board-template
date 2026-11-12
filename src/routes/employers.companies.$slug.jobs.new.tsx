/**
 * Company workspace — Post a job. One-page wizard mirroring the hosted
 * employer post flow: the job details (public /post field set) plus the
 * billing choice — an existing credit or a new plan — submit together.
 * A credit (or free plan) publishes immediately; a paid plan redirects to
 * checkout; an invoice-only plan reports the emailed invoice. The job is
 * created first, so a failed payment still leaves it recoverable from the
 * jobs list.
 *
 * The form itself lives in `EmployerJobForm`, shared with the per-job edit
 * page so the two never drift.
 */
import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { incomingAuthSearch } from '../lib/board-datalayer-events';
import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getCompanyWorkspace } from '../server/employers';
import { getPostingMembershipPlans } from '../server/membership-pages';
import { getRemotePermits, getSeoBase } from '../server/queries';
import { useMembershipOffer } from './-membership-offer';
import { useGlobalLocationSuggestions } from './-use-global-location-suggestions';

import { resolveJobFormConstraints } from '@/board/job-form';
import {
  MembershipPostGate,
  membershipJoinHeading,
  sellsMemberships,
} from '@/components/board/membership-post-gate';
import { EmployerJobForm } from '@/components/employer-job-form';
import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/employers/companies/$slug/jobs/new')({
  loader: async ({ params, location }) => {
    try {
      const [workspace, remotePermits, seo, membershipPlans] =
        await Promise.all([
          getCompanyWorkspace({ data: { slug: params.slug } }),
          // Taxonomy garnish — the form falls back to countries-only.
          getRemotePermits().catch(() => null),
          getSeoBase(),
          // What the members-only gate sells when this company can't post
          // yet. Empty on an open board; a failed read leaves the gate
          // linking to /memberships instead.
          getPostingMembershipPlans().catch(() => []),
        ]);
      return { workspace, remotePermits, seo, membershipPlans };
    } catch (error) {
      return await handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/jobs/new`,
        {
          retried: isReauthRetry(location),
          incomingSearch: incomingAuthSearch(location),
        },
      );
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: headTitle(
          loaderData?.seo.boardName,
          m.employerCompany_postJobHeading(),
        ),
      },
    ],
  }),
  staticData: { ownsMain: true },
  component: NewJobPage,
});

const rootApi = getRouteApi('__root__');

function NewJobPage() {
  const { workspace, remotePermits, membershipPlans } = Route.useLoaderData();
  const membershipOffer = useMembershipOffer(membershipPlans);
  const { board, offerGate } = rootApi.useLoaderData();
  const locale = getLocale();
  // A company that can't post here sees the membership gate instead of the
  // form, so the "fill in the role" subtitle would describe nothing. When the
  // gate sells memberships, the page heading is about joining instead.
  const canPost = workspace.billingOptions.capabilities.canPost;
  const joinHeading =
    !canPost && sellsMemberships(membershipOffer)
      ? membershipJoinHeading(board.name)
      : null;
  const officeLocationSuggestions = useGlobalLocationSuggestions({
    countries: resolveJobFormConstraints(board).location.allowedCountries,
  });

  return (
    <Page width="content">
      <PageContent>
        <div className="space-y-6">
          <header className="space-y-1">
            <Text as="h1" variant="heading1">
              {joinHeading?.title ?? m.employerCompany_postJobHeading()}
            </Text>
            {joinHeading ? (
              <p className="text-muted-foreground text-sm" dir="auto">
                {joinHeading.description}
              </p>
            ) : canPost ? (
              <p className="text-muted-foreground text-sm">
                {m.employerPostJob_subtitleText()}
              </p>
            ) : null}
          </header>

          <EmployerJobForm
            slug={workspace.slug}
            locale={locale}
            remotePermits={remotePermits?.data ?? null}
            plans={workspace.plans}
            billingOptions={workspace.billingOptions.data}
            officeLocationSuggestions={officeLocationSuggestions}
            jobForm={board}
            customFields={board.customFields.job}
            nativeApplications={board.features.nativeApplications}
            mode={{ kind: 'create' }}
            canPost={canPost}
            membershipGate={
              <MembershipPostGate
                boardName={board.name}
                contactEmail={board.footer.contactEmail}
                signedIn
                showCompanyWorkspaceLink={false}
                hasMembershipPage={offerGate.hasMembershipPage}
                companySlug={workspace.slug}
                returnTo={`/employers/companies/${workspace.slug}/jobs/new`}
                offer={membershipOffer}
              />
            }
          />
        </div>
      </PageContent>
    </Page>
  );
}
