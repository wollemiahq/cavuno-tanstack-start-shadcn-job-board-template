import { isNotFound } from '@cavuno/board';
import { companyIntro } from '@cavuno/board/format';
import {
  buildJobBreadcrumbs,
  createJobPostingJsonLd,
  listingJsonLd,
} from '@cavuno/board/seo';
/**
 * Job detail — hosted-parity URL (/companies/:companySlug/jobs/:jobSlug),
 * rendered by the @cavuno registry `job-detail` block (Wave D, ADR-0058):
 * the route owns the loader, head/JSON-LD, and the interactive slots
 * (apply via `@cavuno/apply-flow`, alerts via `@cavuno/alert-signup`,
 * plus the starter's own save-job control); the block owns the page
 * assembly. The similar-jobs rail degrades to empty on a search outage,
 * matching the hosted page (the rail is never fatal to the render).
 */
import {
  Await,
  createFileRoute,
  getRouteApi,
  notFound,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import { Search } from 'lucide-react';

import { jobAlertDefaultsFromJob } from '../lib/job-alert-defaults';
import { m } from '../paraglide/messages';
import { getSessionUser, saveJob } from '../server/account';
import { applyToJob, myApplicationForJob } from '../server/applications';
import {
  getCompany,
  getJob,
  getSeoBase,
  getSimilarJobs,
  resolveTaxonomyChips,
  subscribeJobAlert,
} from '../server/queries';

import { toJobDetailVM } from '@/board/job-detail-view-model';
import { toJobCardVM } from '@/board/job-view-model';
import { AlertSignupForm } from '@/components/board/alert-signup-form';
import { ApplyButton } from '@/components/board/apply-button';
import { CopyLinkButton } from '@/components/board/copy-link-button';
import { JobDetail } from '@/components/board/job-detail';
import { JobList } from '@/components/board/job-list';
import { PageBody } from '@/components/board/page-body';
import { SaveJobButton } from '@/components/board/save-job-button';
import { JsonLd } from '@/components/json-ld';
import { Text } from '@/components/text';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { headTitle } from '@/lib/page-title';
import { resolveCardTaxonomy } from '@/lib/resolve-card-taxonomy';
import type { PublicJobCard } from '@cavuno/board';

export const Route = createFileRoute('/companies/$companySlug/jobs/$jobSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: async ({ params }) => {
    try {
      // `board` comes from the root loader (read via rootApi in the component):
      // this loader neither gates on it nor uses it in head(), so it is not
      // re-fetched here — that would be a duplicate board-context read.
      const [job, user, company, seo] = await Promise.all([
        getJob({ data: { jobSlug: params.jobSlug } }),
        getSessionUser(),
        getCompany({ data: { companySlug: params.companySlug } }).catch(
          () => null,
        ),
        getSeoBase(),
      ]);
      // Similar-jobs is a below-the-fold, search-backed rail — defer it so a
      // slow (or failing) similar backend never blocks the job's first paint.
      // Streamed via <Await>; a search outage (503) hides it, never breaks the
      // page (mirrors the hosted similar-jobs loader).
      // Resolve the similar cards' own tag pills alongside the deferred rail —
      // the similar jobs carry their own categories/skills, distinct from this
      // job's, so they need their own resolves-or-omits map.
      const similar = getSimilarJobs({ data: { jobSlug: params.jobSlug } })
        .then(async (r) => ({
          jobs: r.data,
          resolvableTaxonomy: await resolveCardTaxonomy(r.data),
        }))
        .catch(() => ({
          jobs: [] as PublicJobCard[],
          resolvableTaxonomy: {} as Record<string, string>,
        }));
      const application = user?.emailVerified
        ? await myApplicationForJob({
            data: { jobSlug: params.jobSlug },
          }).catch(() => null)
        : null;
      // Drop category/skill chips whose slug the taxonomy resolver rejects (a
      // facet/taxonomy read-model drift on the board would otherwise render a
      // chip that 404s). On a healthy board every tag resolves and the set is
      // complete. A resolve outage degrades to "no chips", never a broken link.
      const resolvableTaxonomy = await resolveTaxonomyChips({
        data: {
          candidates: [
            ...(job.categories ?? []).map((c) => ({
              type: 'category' as const,
              slug: c.slug,
            })),
            ...(job.skills ?? []).map((s) => ({
              type: 'skill' as const,
              slug: s.slug,
            })),
          ],
        },
      }).catch(() => ({}) as Record<string, string>);
      return {
        job,
        user,
        similar,
        company,
        seo,
        resolvableTaxonomy,
        alreadyApplied: application !== null,
      };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { job, seo } = loaderData;
    const title = job.company?.name
      ? `${job.title} at ${job.company.name}`
      : job.title;
    const description = job.description
      ? job.description
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
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
        { title: headTitle(loaderData?.seo.boardName, title) },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        ...(canonical ? [{ property: 'og:url', content: canonical }] : []),
        ...(ogImage
          ? [
              { property: 'og:image', content: ogImage },
              { name: 'twitter:card', content: 'summary_large_image' },
              { name: 'twitter:image', content: ogImage },
            ]
          : []),
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    };
  },
  component: JobDetailPage,
  notFoundComponent: () => (
    <PageBody>
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyTitle>{m.companyJobDetail_notFoundText()}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </PageBody>
  ),
});

const rootApi = getRouteApi('__root__');

function JobDetailPage() {
  const {
    job,
    user,
    similar,
    company,
    seo,
    resolvableTaxonomy,
    alreadyApplied,
  } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const { companySlug } = Route.useParams();
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
    companyIntro(null, company?.description ?? null),
    board.language,
    board.labels,
    resolvableTaxonomy,
  );

  const jsonLd = [
    createJobPostingJsonLd({ job, board, shareUrl: job.links.public ?? '' }),
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
              <CopyLinkButton
                url={vm.canonicalUrl}
                language={board.language}
                labels={board.labels}
              />
            ) : (
              <span />
            )}
          </>
        }
        similarSlot={
          <Await promise={similar} fallback={null}>
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
                      toJobCardVM(
                        job,
                        board.language,
                        board.labels,
                        similarRail.resolvableTaxonomy,
                      ),
                    )}
                    language={board.language}
                    labels={board.labels}
                    variant="compact"
                  />
                </section>
              ) : null
            }
          </Await>
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
