/**
 * Embeddable jobs widget — the headless equivalent of the hosted board's
 * `/embed/jobs`. A compact, **noindex** card list a board owner drops into a
 * third-party site via an iframe. Reads `board.embed.jobs()` (UNGATED — the
 * candidate paywall never applies here) and shows the "Powered by Cavuno" badge
 * unless the board has whitelabelled it off (`context.showCavunoBranding`).
 *
 * Chrome (the badge, the "see all jobs" CTA, the empty state) is owned by THIS
 * frontend (the API is a data contract only); only the card data +
 * the branding flag come from the API.
 */
import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { embedJobs, getBoardContext } from '../server/queries';

import { toJobCardVM } from '@/board/job-view-model';
import { JobCard } from '@/components/board/job-card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { headTitle } from '@/lib/page-title';
import { cn } from '@/lib/utils';
import type {
  EmploymentType,
  PublicJobCard,
  RemoteOption,
  Seniority,
} from '@cavuno/board';

const REMOTE_OPTIONS: readonly RemoteOption[] = ['on_site', 'hybrid', 'remote'];
const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
  'volunteer',
  'other',
];
const SENIORITIES: readonly Seniority[] = [
  'entry_level',
  'associate',
  'mid_level',
  'senior',
  'lead',
  'principal',
  'director',
  'executive',
];

interface EmbedSearch {
  q?: string;
  remoteOption?: RemoteOption;
  employmentType?: EmploymentType;
  seniority?: Seniority;
  location?: string;
  limit?: number;
  cursor?: string;
}

export const Route = createFileRoute('/embed/jobs')({
  validateSearch: (search: Record<string, unknown>): EmbedSearch => ({
    // The hosted embed widget's keyword URL param is `query` (it maps to the
    // API's `q`); accept it so an existing `<iframe …?query=…>` is a faithful
    // drop-in, falling back to the starter's own `q`.
    q:
      typeof search.query === 'string' && search.query
        ? search.query
        : typeof search.q === 'string' && search.q
          ? search.q
          : undefined,
    remoteOption: REMOTE_OPTIONS.includes(search.remoteOption as RemoteOption)
      ? (search.remoteOption as RemoteOption)
      : undefined,
    employmentType: EMPLOYMENT_TYPES.includes(
      search.employmentType as EmploymentType,
    )
      ? (search.employmentType as EmploymentType)
      : undefined,
    seniority: SENIORITIES.includes(search.seniority as Seniority)
      ? (search.seniority as Seniority)
      : undefined,
    location:
      typeof search.location === 'string' && search.location
        ? search.location
        : undefined,
    limit:
      typeof search.limit === 'number' && Number.isFinite(search.limit)
        ? search.limit
        : undefined,
    cursor:
      typeof search.cursor === 'string' && search.cursor
        ? search.cursor
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [page, context] = await Promise.all([
      embedJobs({
        data: {
          q: deps.q,
          remoteOption: deps.remoteOption ? [deps.remoteOption] : undefined,
          employmentType: deps.employmentType
            ? [deps.employmentType]
            : undefined,
          seniority: deps.seniority ? [deps.seniority] : undefined,
          location: deps.location,
          limit: deps.limit,
          cursor: deps.cursor,
        },
      }),
      getBoardContext(),
    ]);
    return {
      page,
      showCavunoBranding: context.showCavunoBranding,
      boardName: context.name,
    };
  },
  // The embed widget is a fragment meant to be iframed — never indexed (parity
  // with the hosted `(embed)` layout's `robots: { index: false }`).
  head: ({ loaderData }) => ({
    meta: [
      // One key, both cases: the seam drops the suffix by itself when the
      // board name is unresolvable, so the old `…_metaTitleFallback` twin
      // is gone.
      { title: headTitle(loaderData?.boardName, m.embedJobs_metaTitle()) },
      ...(loaderData
        ? [
            {
              name: 'description',
              content: m.embedJobs_metaDescription({
                boardName: loaderData.boardName,
              }),
            },
          ]
        : []),
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: EmbedJobsPage,
});

/**
 * The hosted widget's CTA logic (`buildEmbedJobsCta`), reproduced as starter
 * chrome: a "see all jobs" link when there are more matches than this page
 * shows, pointing back at this frontend's own jobs listing.
 */
function buildEmbedCta(
  search: EmbedSearch,
  pageSize: number,
  total: number | undefined,
): { label: string; search: Record<string, unknown> } | null {
  const hasFilters = Boolean(
    search.q ||
    search.location ||
    search.employmentType ||
    search.remoteOption ||
    search.seniority,
  );
  const hasMoreThanShown = typeof total === 'number' && total > pageSize;

  if (hasFilters && hasMoreThanShown) {
    return {
      label: m.embedJobs_seeAllMatchingJobsLabel(),
      search: {
        q: search.q,
        remoteOption: search.remoteOption,
        employmentType: search.employmentType,
        seniority: search.seniority,
      },
    };
  }
  if (hasFilters || hasMoreThanShown) {
    return { label: m.embedJobs_viewAllJobsLabel(), search: {} };
  }
  return null;
}

const rootApi = getRouteApi('__root__');

function EmbedJobsPage() {
  const { page, showCavunoBranding } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const search = Route.useSearch();
  const jobs = page.data as PublicJobCard[];
  const pageSize = search.limit ?? 8;
  const cta = buildEmbedCta(search, pageSize, page.count);

  return (
    <section className="space-y-4" data-test="embed-jobs-widget">
      {jobs.length > 0 ? (
        <div className="space-y-3" data-test="embed-jobs-list">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              vm={toJobCardVM(job, board.language, board.labels)}
            />
          ))}
        </div>
      ) : (
        <Empty className="border py-8">
          <EmptyHeader>
            <EmptyTitle>{m.embedJobs_noJobsMatchText()}</EmptyTitle>
            <EmptyDescription>
              {m.embedJobs_tryRelaxingFiltersText()}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {showCavunoBranding || cta ? (
        <div className="flex min-h-8 items-center justify-between gap-2">
          {showCavunoBranding ? (
            <Badge
              render={
                <a
                  href="https://cavuno.com"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="secondary"
            >
              {m.embedJobs_poweredByCavunoLabel()}
            </Badge>
          ) : (
            <span />
          )}

          {cta ? (
            <Link
              to="/"
              search={cta.search}
              target="_blank"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'no-underline',
              )}
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
