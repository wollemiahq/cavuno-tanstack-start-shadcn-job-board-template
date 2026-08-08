import { isNotFound } from '@cavuno/board';
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
  notFound,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import { Search } from 'lucide-react';

import { jobAlertDefaultsFromJob } from '../lib/job-alert-defaults';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSessionUser, saveJob } from '../server/account';
import { applyToJob, myApplicationForJob } from '../server/applications';
import { getJobDetailPage } from '../server/job-detail-page';
import {
  getCompany,
  getSimilarJobs,
  subscribeJobAlert,
} from '../server/queries';

import { toJobDetailVM } from '@/board/job-detail-view-model';
import { toJobCardVM } from '@/board/job-view-model';
import { AlertSignupForm } from '@/components/board/alert-signup-form';
import { ApplyButton } from '@/components/board/apply-button';
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
import type { PublicJobCard } from '@cavuno/board';

export const Route = createFileRoute('/companies/$companySlug/jobs/$jobSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    try {
      // `board` comes from the root loader (read via rootApi in the component):
      // this loader neither gates on it nor uses it in head(), so it is not
      // re-fetched here — that would be a duplicate board-context read.
      // getJobDetailPage returns job + seo + precomputed head/jsonLd so the
      // route module never imports @cavuno/board/seo into the client graph.
      // Similar-jobs is a below-the-fold, search-backed rail. It needs only
      // the job slug, so it is kicked off BEFORE the batch below is awaited —
      // starting it after made it a second serial wave, and SSR renders the
      // rail into the document, so "deferred" did not keep it off the
      // first-byte path. A search outage (503) hides it, never breaks the
      // page (mirrors the hosted similar-jobs loader).
      const similar = getSimilarJobs({ data: { jobSlug: params.jobSlug } })
        .then((r) => ({ jobs: r.data }))
        .catch(() => ({ jobs: [] as PublicJobCard[] }));
      // The application lookup is CHAINED off the session probe inside the
      // batch rather than awaited after it: it needs only the job slug, and
      // `user` is just a gate, so as a trailing `await` it was a third
      // serial wave for every signed-in candidate. Anonymous visitors still
      // pay nothing (the chain short-circuits to null).
      // Company retrieve is only for `summary` (about-card intro). Name/logo/
      // link come from job.company; never use company.description HTML here.
      const [page, session, company] = await Promise.all([
        getJobDetailPage({ data: { jobSlug: params.jobSlug } }),
        getSessionUser().then(async (user) => ({
          user,
          application: user?.emailVerified
            ? await myApplicationForJob({
                data: { jobSlug: params.jobSlug },
              }).catch(() => null)
            : null,
        })),
        getCompany({ data: { companySlug: params.companySlug } }).catch(
          () => null,
        ),
      ]);
      const { user, application } = session;
      // Category/skill chips link directly: every slug the API emits
      // resolves (ADR-0099 platform guarantee) — no re-verification round trip.
      return {
        job: page.job,
        user,
        similar,
        companySummary: company?.summary ?? null,
        seo: page.seo,
        head: page.head,
        jsonLd: page.jsonLd,
        alreadyApplied: application !== null,
      };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
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
  const { job, user, similar, companySummary, alreadyApplied } =
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
            language={board.language}
            returnTo={returnTo}
            nativeApplications={board.features.nativeApplications}
            viewer={user ? { emailVerified: user.emailVerified } : null}
            alreadyApplied={alreadyApplied}
            onApply={async (jobSlug) => {
              await applyToJob({ data: { jobSlug } });
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
