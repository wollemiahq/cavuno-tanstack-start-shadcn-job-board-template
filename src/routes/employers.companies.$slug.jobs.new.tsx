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
import { getRemotePermits, getSeoBase } from '../server/queries';
import { useLocationSuggestions } from './-use-location-suggestions';

import { MembershipPostGate } from '@/components/board/membership-post-gate';
import { EmployerJobForm } from '@/components/employer-job-form';
import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute('/employers/companies/$slug/jobs/new')({
  loader: async ({ params, location }) => {
    try {
      const [workspace, remotePermits, seo] = await Promise.all([
        getCompanyWorkspace({ data: { slug: params.slug } }),
        // Taxonomy garnish — the form falls back to countries-only.
        getRemotePermits().catch(() => null),
        getSeoBase(),
      ]);
      return { workspace, remotePermits, seo };
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
  const { workspace, remotePermits } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const locale = getLocale();
  const officeLocationSuggestions = useLocationSuggestions(locale);

  return (
    <Page width="content">
      <PageContent>
        <div className="space-y-6">
          <header className="space-y-1">
            <Text as="h1" variant="heading1">
              {m.employerCompany_postJobHeading()}
            </Text>
            <p className="text-muted-foreground text-sm">
              {m.employerPostJob_subtitleText()}
            </p>
          </header>

          <EmployerJobForm
            slug={workspace.slug}
            locale={locale}
            remotePermits={remotePermits?.data ?? null}
            plans={workspace.plans}
            billingOptions={workspace.billingOptions.data}
            officeLocationSuggestions={officeLocationSuggestions}
            jobForm={board}
            mode={{ kind: 'create' }}
            membershipGate={
              <MembershipPostGate
                boardName={board.name}
                contactEmail={board.footer.contactEmail}
                signedIn
                returnTo={`/employers/companies/${workspace.slug}/jobs/new`}
              />
            }
          />
        </div>
      </PageContent>
    </Page>
  );
}
