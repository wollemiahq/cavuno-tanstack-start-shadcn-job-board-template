/**
 * Company workspace — Edit a job. Shares `EmployerJobForm` with "Post a job",
 * prefilled from the job's full detail. Any job that is not live (a held
 * draft, an expired or archived job) owns the plan picker + payment step here
 * (the same billing choice as posting), so it is published or renewed from
 * its own edit page rather than an inline popover on the jobs list. A live
 * published job edits its details only.
 *
 * Expiry is derived in the loader — server-side on a document load — so the
 * first client render agrees with the server about whether the billing card
 * exists. It is the same rule the jobs list applies to offer Republish.
 */
import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import { incomingAuthSearch } from '../lib/board-datalayer-events';
import {
  handleEmployerLoaderError,
  isReauthRetry,
} from '../lib/employer-loader-auth';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getCompanyWorkspace, getJob } from '../server/employers';
import { getRemotePermits, getSeoBase } from '../server/queries';
import { useLocationSuggestions } from './-use-location-suggestions';

import { EmployerJobForm } from '@/components/employer-job-form';
import { Page, PageContent } from '@/components/layout/page';
import { Text } from '@/components/text';
import { isEmployerJobExpired } from '@/lib/employer-job-labels';
import { headTitle } from '@/lib/page-title';

export const Route = createFileRoute(
  '/employers/companies/$slug/jobs/$jobId/edit',
)({
  loader: async ({ params, location }) => {
    try {
      const [workspace, job, remotePermits, seo] = await Promise.all([
        getCompanyWorkspace({ data: { slug: params.slug } }),
        getJob({ data: { slug: params.slug, id: params.jobId } }),
        getRemotePermits().catch(() => null),
        getSeoBase(),
      ]);
      return {
        workspace,
        job,
        remotePermits,
        seo,
        status: isEmployerJobExpired(job) ? ('expired' as const) : job.status,
      };
    } catch (error) {
      return await handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/jobs/${params.jobId}/edit`,
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
          m.employerEditJob_heading(),
        ),
      },
    ],
  }),
  staticData: { ownsMain: true },
  component: EditJobPage,
});

const rootApi = getRouteApi('__root__');

function EditJobPage() {
  const { workspace, job, remotePermits, status } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const locale = getLocale();
  const officeLocationSuggestions = useLocationSuggestions(locale);
  const isDraft = job.status === 'draft';

  return (
    <Page width="content">
      <PageContent>
        <div className="space-y-6">
          <header className="space-y-1">
            <Text as="h1" variant="heading1">
              {m.employerEditJob_heading()}
            </Text>
            <p className="text-muted-foreground text-sm">
              {isDraft
                ? m.employerEditJob_draftSubtitleText()
                : m.employerEditJob_subtitleText()}
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
            mode={{ kind: 'edit', jobId: job.id, status }}
            job={job}
          />
        </div>
      </PageContent>
    </Page>
  );
}
