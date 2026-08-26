/**
 * Job detail — hosted-parity URL (/companies/:companySlug/jobs/:jobSlug),
 * rendered by the @cavuno registry `job-detail` block:
 * the route owns the loader, head/JSON-LD, and the interactive slots
 * (apply via `@cavuno/apply-flow`, alerts via `@cavuno/alert-signup`,
 * plus the starter's own save-job control); the block owns the page
 * assembly. The similar-jobs rail degrades to empty on a search outage,
 * matching the hosted page (the rail is never fatal to the render).
 *
 * Head meta + JobPosting/breadcrumb JSON-LD are computed inside
 * `getJobDetailPage` so `@cavuno/board/seo` stays off the universal client
 * entry (same pattern as the salary hub's getSalaryHubPage).
 */
import {
  createFileRoute,
  getRouteApi,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import { Search } from 'lucide-react';

import { jobAlertDefaultsFromJob } from '../lib/job-alert-defaults';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { saveJob } from '../server/account';
import { applyToJob, prepareApplyToJob } from '../server/applications';
import { subscribeJobAlert } from '../server/queries';
import { createJobDetailLoader } from './-job-detail-loader';

import { toJobDetailVM } from '@/board/job-detail-view-model';
import { toJobCardVM } from '@/board/job-view-model';
import { AlertSignupForm } from '@/components/board/alert-signup-form';
import { ApplyButton } from '@/components/board/apply-button';
import { BoardAdSlot } from '@/components/board/board-ad-slot';
import { CopyLinkButton } from '@/components/board/copy-link-button';
import { JobDetail } from '@/components/board/job-detail';
import { JobList } from '@/components/board/job-list';
import { SaveJobButton } from '@/components/board/save-job-button';
import { DeferredContent } from '@/components/deferred-content';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { PageLayout } from '@/components/layout/page-layout';
import { Text } from '@/components/text';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { companyIntro } from '@/lib/company-intro';

export const Route = createFileRoute('/companies/$companySlug/jobs/$jobSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: createJobDetailLoader(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: JobDetailPage,
  notFoundComponent: () => (
    <PageLayout>
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyTitle>{m.companyJobDetail_notFoundText()}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </PageLayout>
  ),
});

const rootApi = getRouteApi('__root__');

function JobDetailPage() {
  const { job, user, similar, companySummary, applicationState } =
    Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const defaults = jobAlertDefaultsFromJob(job);
  const router = useRouter();
  const returnTo = useLocation({ select: (location) => location.href });

  const vm = toJobDetailVM(
    job,
    board.customFields,
    // The live similar-jobs rail is deferred and rendered via `similarSlot`
    // below; `<JobDetail>` does not consume `vm.similar`, so an empty list here
    // keeps the VM call intact without blocking first paint on the rail.
    [],
    companyIntro(companySummary),
    board.language,
    getLocale(),
  );

  return (
    <>
      <JobDetail
        vm={vm}
        applySlot={
          <ApplyButton
            jobSlug={job.slug}
            applicationUrl={job.applicationUrl}
            applyAction={job.applyAction}
            language={board.language}
            returnTo={returnTo}
            nativeApplications={board.features.nativeApplications}
            viewer={user ? { emailVerified: user.emailVerified } : null}
            applicationState={applicationState}
            onRetryApplicationState={() => router.invalidate()}
            onPrepareApply={(jobSlug) =>
              prepareApplyToJob({ data: { jobSlug } })
            }
            onApply={async (jobSlug, approvalReceipt) => {
              await applyToJob({ data: { jobSlug, approvalReceipt } });
            }}
          />
        }
        secondaryActions={
          <>
            <SaveJobButton
              jobId={job.id}
              viewer={user ? { emailVerified: user.emailVerified } : null}
              returnTo={returnTo}
              block
              labels={{
                save: m.companyJobDetail_saveJobLabel(),
                saving: m.companyJobDetail_savingLabel(),
                saved: m.companyJobDetail_savedViewInAccountLabel(),
                error: m.saveJobButton_errorText(),
              }}
              onSave={async (jobId) => {
                await saveJob({ data: { jobId } });
              }}
              onSaved={() => router.invalidate()}
            />
            {/* Copy the job's canonical public URL (the API's links.public via
                the VM) — works for everyone, no gating. */}
            {vm.canonicalUrl ? (
              <CopyLinkButton url={vm.canonicalUrl} language={board.language} />
            ) : (
              <span />
            )}
          </>
        }
        similarSlot={
          <DeferredContent promise={similar}>
            {(similarRail) =>
              similarRail.jobs.length > 0 ? (
                <section
                  aria-label={vm.similarJobsHeading}
                  className="flex flex-col gap-4"
                >
                  <Text as="h2" variant="heading4">
                    {vm.similarJobsHeading}
                  </Text>
                  <BoardAdSlot
                    placement="job:detail.similar"
                    className="py-4"
                  />
                  <JobList
                    jobs={similarRail.jobs.map((job) =>
                      toJobCardVM(job, getLocale()),
                    )}
                    language={board.language}
                    variant="compact"
                  />
                </section>
              ) : null
            }
          </DeferredContent>
        }
        alertSlot={
          board.features.jobAlerts ? (
            <AlertSignupForm
              filters={defaults.filters}
              context={defaults.context}
              language={board.language}
              onSubscribe={async (input) => {
                const result = await subscribeJobAlert({ data: input });
                return { status: result.status };
              }}
              // Job-page alert variant — the hosted board stores these as
              // jobCardLabels.jobAlertJob{Title,Description}; resolve the
              // stored override with the starter's English as the floor
              // (catalog keys for the variants land with the authed slice).
              title={m.companyJobDetail_defaultAlertTitle()}
              description={m.companyJobDetail_defaultAlertDescription()}
            />
          ) : null
        }
      />
    </>
  );
}
