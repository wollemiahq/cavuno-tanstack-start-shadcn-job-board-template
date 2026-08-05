/**
 * Company workspace — Edit a job. Shares `EmployerJobForm` with "Post a job",
 * prefilled from the job's full detail. A DRAFT owns the plan picker + payment
 * step here (the same billing choice as posting), so a held draft is published
 * from its own edit page rather than an inline popover on the jobs list. A
 * published/expired job edits its details only.
 */
import { createFileRoute } from '@tanstack/react-router';

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
      return { workspace, job, remotePermits, seo };
    } catch (error) {
      return await handleEmployerLoaderError(
        error,
        `/employers/companies/${params.slug}/jobs/${params.jobId}/edit`,
        { retried: isReauthRetry(location) },
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

function EditJobPage() {
  const { workspace, job, remotePermits } = Route.useLoaderData();
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
            mode={{ kind: 'edit', jobId: job.id, status: job.status }}
            job={job}
          />
        </div>
      </PageContent>
    </Page>
  );
}
