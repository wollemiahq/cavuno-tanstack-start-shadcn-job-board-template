import { lazy, Suspense, type ReactNode } from 'react';

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
import { redirect, createFileRoute, Link } from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { baseLocale, getLocale } from '../paraglide/runtime';
import { embedJobs, getBoardContext } from '../server/queries';
import { useKeywordSuggestions } from './-use-keyword-suggestions';
import { useLocationSuggestions } from './-use-location-suggestions';

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
import {
  searchNumber,
  searchString,
  type UrlSearchInput,
} from '@/lib/pagination';
import { cn } from '@/lib/utils';
import type {
  EmploymentType,
  PublicJobCard,
  RemoteOption,
  Seniority,
} from '@cavuno/board';

/**
 * The header drags in the combobox + sheet + select graph. Static-importing it
 * hoisted all of that into the always-loaded shell chunk and blew the bundle
 * budget for every page on the board — so it is lazy, the same way
 * `header-search-enhanced` and `company-jobs-search-bar` treat these widgets.
 * The reserved height keeps the card list from jumping when it lands.
 */
const LazyEmbedJobsHeader = lazy(() =>
  import('@/components/board/embed-jobs-header').then(
    ({ EmbedJobsHeader }) => ({ default: EmbedJobsHeader }),
  ),
);

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

function embedRemoteOption(value: UrlSearchInput[string]) {
  const option = searchString(value);
  return REMOTE_OPTIONS.find((candidate) => candidate === option);
}

function embedEmploymentType(value: UrlSearchInput[string]) {
  const type = searchString(value);
  return EMPLOYMENT_TYPES.find((candidate) => candidate === type);
}

function embedSeniority(value: UrlSearchInput[string]) {
  const seniority = searchString(value);
  return SENIORITIES.find((candidate) => candidate === seniority);
}

export const Route = createFileRoute('/embed/jobs')({
  // The embed is a third-party iframe fragment with no locale identity —
  // /fr/embed/jobs would leak the visiting operator's chrome locale into
  // someone else's site. Canonical URL only.
  beforeLoad: () => {
    if (getLocale() !== baseLocale) {
      throw redirect({ href: '/embed/jobs', replace: true });
    }
  },
  validateSearch: (search: UrlSearchInput): EmbedSearch => ({
    // The hosted embed widget's keyword URL param is `query` (it maps to the
    // API's `q`); accept it so an existing `<iframe …?query=…>` is a faithful
    // drop-in, falling back to the starter's own `q`.
    q: searchString(search.query) ?? searchString(search.q),
    remoteOption: embedRemoteOption(search.remoteOption),
    employmentType: embedEmploymentType(search.employmentType),
    seniority: embedSeniority(search.seniority),
    location: searchString(search.location),
    limit: searchNumber(search.limit),
    cursor: searchString(search.cursor),
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
      logoUrl: context.logoUrl ?? null,
      jobForm:
        'jobForm' in context
          ? (context as { jobForm: unknown }).jobForm
          : undefined,
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
): { label: string; search: UrlSearchInput } | null {
  const hasFilters = Boolean(
    search.q ||
    search.location ||
    search.employmentType ||
    search.remoteOption ||
    search.seniority,
  );
  const count = total ?? Number.NaN;
  const hasMoreThanShown = Number.isFinite(count) && count > pageSize;

  if (hasFilters && hasMoreThanShown) {
    return {
      label: m.embedJobs_seeAllMatchingJobsLabel(),
      search: {
        q: search.q,
        location: search.location,
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

export function EmbedJobsView({
  page,
  showCavunoBranding,
  boardName,
  logoUrl,
  search,
  jobForm,
  dependencies = embedJobsViewDependencies,
}: {
  page: { data: PublicJobCard[]; count?: number };
  showCavunoBranding: boolean;
  boardName: string;
  logoUrl: string | null;
  search: EmbedSearch;
  jobForm?: unknown;
  dependencies?: EmbedJobsViewDependencies;
}) {
  const jobs = page.data;
  const pageSize = search.limit ?? 8;
  const cta = buildEmbedCta(search, pageSize, page.count);
  // The route owns the suggestion controllers and passes them down, so the
  // header stays a props-only component (AGENTS.md: components never fetch) —
  // the same split `__root.tsx` and the company-jobs subpage already use.
  const locale = dependencies.getLocale();
  const keywordSuggestions = dependencies.useKeywordSuggestions(true);
  const locationSuggestions = dependencies.useLocationSuggestions(locale);

  return (
    <section className="space-y-4" data-test="embed-jobs-widget">
      <Suspense fallback={<div className="mb-6 h-9" />}>
        {dependencies.renderHeader({
          boardName,
          logoUrl,
          initialSearch: {
            q: search.q,
            location: search.location,
            remoteOption: search.remoteOption,
            employmentType: search.employmentType,
            seniority: search.seniority ? [search.seniority] : undefined,
          },
          keywordSuggestions,
          locationSuggestions,
        })}
      </Suspense>
      {jobs.length > 0 ? (
        <div className="space-y-3" data-test="embed-jobs-list">
          {jobs.map((job) => (
            <div key={job.id} className="contents">
              {dependencies.renderJobCard({
                job,
                locale,
                openInNewTab: true,
                jobForm,
              })}
            </div>
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

          {cta ? dependencies.renderCtaLink(cta) : null}
        </div>
      ) : null}
    </section>
  );
}

type EmbedJobsHeaderInput = {
  boardName: string;
  logoUrl: string | null;
  initialSearch: {
    q?: string;
    location?: string;
    remoteOption?: RemoteOption;
    employmentType?: EmploymentType;
    seniority?: Seniority[];
  };
  keywordSuggestions: ReturnType<typeof useKeywordSuggestions>;
  locationSuggestions: ReturnType<typeof useLocationSuggestions>;
};

export type EmbedJobsViewDependencies = {
  getLocale: typeof getLocale;
  renderCtaLink: (
    cta: NonNullable<ReturnType<typeof buildEmbedCta>>,
  ) => ReactNode;
  renderHeader: (input: EmbedJobsHeaderInput) => ReactNode;
  renderJobCard: (input: {
    job: PublicJobCard;
    locale: string;
    openInNewTab: boolean;
    jobForm?: unknown;
  }) => ReactNode;
  useKeywordSuggestions: typeof useKeywordSuggestions;
  useLocationSuggestions: typeof useLocationSuggestions;
};

export const embedJobsViewDependencies: EmbedJobsViewDependencies = {
  getLocale,
  renderCtaLink: (cta) => (
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
  ),
  renderHeader: (input) => <LazyEmbedJobsHeader {...input} />,
  renderJobCard: ({ job, locale, openInNewTab, jobForm }) => (
    <JobCard
      vm={toJobCardVM(job, locale, jobForm)}
      openInNewTab={openInNewTab}
    />
  ),
  useKeywordSuggestions,
  useLocationSuggestions,
};

function EmbedJobsPage() {
  const { page, showCavunoBranding, boardName, logoUrl, jobForm } =
    Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <EmbedJobsView
      // SAFETY: `embedJobs` returns the public list endpoint payload used by
      // this view; the view reads only `data` cards and optional `count`.
      page={page as { data: PublicJobCard[]; count?: number }}
      showCavunoBranding={showCavunoBranding}
      boardName={boardName}
      logoUrl={logoUrl}
      search={search}
      jobForm={jobForm}
    />
  );
}
