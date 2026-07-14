/**
 * Job detail — hosted-parity URL (/companies/:companySlug/jobs/:jobSlug),
 * rendered by the @cavuno registry `job-detail` block (Wave D, ADR-0058):
 * the route owns the loader, head/JSON-LD, and the interactive slots
 * (apply via `@cavuno/apply-flow`, alerts via `@cavuno/alert-signup`,
 * plus the starter's own save-job control); the block owns the page
 * assembly. The similar-jobs rail degrades to empty on a search outage,
 * matching the hosted page (the rail is never fatal to the render).
 */
import { createFileRoute, notFound, useLocation, useRouter } from "@tanstack/react-router";

import { isNotFound } from "@cavuno/board";
import { companyIntro } from "@cavuno/board/format";
import { buildJobBreadcrumbs, createJobPostingJsonLd, listingJsonLd } from "@cavuno/board/seo";

import { toJobDetailVM } from "@/board/job-detail-view-model";
import { AlertSignupForm } from "@/components/board/alert-signup-form";
import { ApplyButton } from "@/components/board/apply-button";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { SearchLg } from "@untitledui/icons";
import { PageBody } from "@/components/board/page-body";
import { JobDetail } from "@/components/board/job-detail";
import { JobList } from "@/components/board/job-list";
import { SaveJobButton } from "@/components/board/save-job-button";
import { JsonLd } from "@/components/json-ld";
import { jobAlertDefaultsFromJob } from "../lib/job-alert-defaults";
import { m } from "../paraglide/messages";
import { getSessionUser, saveJob } from "../server/account";
import { applyToJob, myApplicationForJob } from "../server/applications";
import {
  getBoardContext,
  getCompany,
  getJob,
  getSeoBase,
  getSimilarJobs,
  subscribeJobAlert,
} from "../server/queries";

export const Route = createFileRoute("/companies/$companySlug/jobs/$jobSlug")({
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    try {
      const [job, board, user, similar, company, seo] = await Promise.all([
        getJob({ data: { jobSlug: params.jobSlug } }),
        getBoardContext(),
        getSessionUser(),
        // The rail is non-fatal — a search outage (503) hides it, never
        // breaks the page (mirrors the hosted similar-jobs loader).
        getSimilarJobs({ data: { jobSlug: params.jobSlug } })
          .then((r) => r.data)
          .catch(() => []),
        getCompany({ data: { companySlug: params.companySlug } }).catch(() => null),
        getSeoBase(),
      ]);
      const application = user?.emailVerified
        ? await myApplicationForJob({ data: { jobSlug: params.jobSlug } }).catch(() => null)
        : null;
      return {
        job,
        board,
        user,
        similar,
        company,
        seo,
        alreadyApplied: application !== null,
      };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { job, board, seo } = loaderData;
    const title = job.company?.name ? `${job.title} at ${job.company.name}` : job.title;
    const description = job.description
      ? job.description
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 160)
      : title;
    // Canonical points at the hosted board (the source of truth for SEO);
    // og:image is the STARTER's own /og route (self-sufficient render).
    const canonical = job.links.public;
    const ogImage =
      job.company?.slug && job.slug
        ? `${seo.origin}/companies/${job.company.slug}/jobs/${job.slug}/og`
        : null;

    return {
      meta: [
        { title: `${title} — ${board.name}` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        ...(canonical ? [{ property: "og:url", content: canonical }] : []),
        ...(ogImage
          ? [
              { property: "og:image", content: ogImage },
              { name: "twitter:card", content: "summary_large_image" },
              { name: "twitter:image", content: ogImage },
            ]
          : []),
      ],
      links: canonical ? [{ rel: "canonical", href: canonical }] : [],
    };
  },
  component: JobDetailPage,
  notFoundComponent: () => (
    <PageBody>
      <EmptyState size="sm" className="py-12">
        <EmptyState.Header>
          <EmptyState.FeaturedIcon icon={SearchLg} color="gray" theme="modern" />
        </EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>{m.companyJobDetail_notFoundText()}</EmptyState.Title>
        </EmptyState.Content>
      </EmptyState>
    </PageBody>
  ),
});

function JobDetailPage() {
  const { job, board, user, similar, company, seo, alreadyApplied } = Route.useLoaderData();
  const { companySlug } = Route.useParams();
  const defaults = jobAlertDefaultsFromJob(job);
  const router = useRouter();
  const returnTo = useLocation({ select: (location) => location.href });

  const vm = toJobDetailVM(
    job,
    board.customFields,
    similar,
    companyIntro(null, company?.description ?? null),
    board.language,
    board.labels,
  );

  const jsonLd = [
    createJobPostingJsonLd({ job, board, shareUrl: job.links.public ?? "" }),
    ...listingJsonLd({
      origin: seo.origin,
      breadcrumbs: buildJobBreadcrumbs(job, board.language, board.labels),
    }),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JobDetail
        vm={vm}
        applySlot={
          <ApplyButton
            jobId={job.id}
            companySlug={companySlug}
            jobSlug={job.slug}
            applicationUrl={job.applicationUrl}
            language={board.language}
            returnTo={returnTo}
            labels={board.labels}
            viewer={user ? { emailVerified: user.emailVerified } : null}
            alreadyApplied={alreadyApplied}
            onApply={async (jobSlug) => {
              await applyToJob({ data: { jobSlug } });
            }}
          />
        }
        secondaryActions={
          <SaveJobButton
            jobId={job.id}
            viewer={user ? { emailVerified: user.emailVerified } : null}
            returnTo={returnTo}
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
        }
        similarSlot={
          similar.length > 0 ? (
            <JobList
              jobs={similar}
              language={board.language}
              labels={board.labels}
              variant="compact"
            />
          ) : null
        }
        alertSlot={
          board.features.jobAlerts ? (
            <AlertSignupForm
              filters={defaults.filters}
              context={defaults.context}
              language={board.language}
              labels={board.labels}
              onSubscribe={async (input) => {
                const result = await subscribeJobAlert({ data: input });
                return { status: result.status };
              }}
              // Job-page alert variant — the hosted board stores these as
              // jobCardLabels.jobAlertJob{Title,Description}; resolve the
              // stored override with the starter's English as the floor
              // (catalog keys for the variants land with the authed slice).
              title={
                board.labels.jobCardLabels?.jobAlertJobTitle ||
                m.companyJobDetail_defaultAlertTitle()
              }
              description={
                board.labels.jobCardLabels?.jobAlertJobDescription ||
                m.companyJobDetail_defaultAlertDescription()
              }
            />
          ) : null
        }
      />
    </>
  );
}
