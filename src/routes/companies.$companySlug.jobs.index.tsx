import { isNotFound } from '@cavuno/board';
/**
 * Company jobs subpage — every open job at one company, with a
 * keyword search and page-based pagination. The `/companies/:slug/jobs/`
 * index sits alongside the job-detail route (`…/jobs/:jobSlug`) without
 * shadowing it (TanStack matches the exact index path).
 *
 * Head + breadcrumb JSON-LD are computed in getCompanyJobsPage so
 * `@cavuno/board/seo` stays out of the universal client entry.
 *
 * Honest pagination + search, both server-side: the jobs SEARCH endpoint
 * (`filters.companySlug`) narrows a free-text query to this company and
 * accepts `offset`, so the `?page=` numbered nav addresses the result set;
 * with no query the BROWSE list (`companySlug` + `offset`) does the same.
 * Both share the `src/lib/pagination.ts` seam that `/jobs` uses. Submitting
 * a fresh query drops `?page=` (see CompanyJobsSearchBar), resetting to
 * page 1.
 */
import {
  createFileRoute,
  getRouteApi,
  notFound,
  useLocation,
} from '@tanstack/react-router';

import { CompanyJobsSearchBar } from '../components/company-jobs-search-bar';
import {
  listingPageHref,
  pageSearchValue,
  pageToOffset,
  parsePageParam,
} from '../lib/pagination';
import { m } from '../paraglide/messages';
import { getCompanyJobsPage } from '../server/companies-pages';
import { getCompany } from '../server/queries';
import { useLocationSuggestions } from './-use-location-suggestions';

import { toJobCardVM } from '@/board/job-view-model';
import { CompanySectionShell } from '@/components/board/company-section-header';
import { JobList } from '@/components/board/job-list';
import { ListingPagination } from '@/components/board/listing-pagination';
import { jsonLdHeadScripts } from '@/components/json-ld';

interface CompanyJobsSearch {
  /** Free-text keyword, scoped to this company via the jobs search endpoint. */
  q?: string;
  /**
   * Place slug for the API's geo-radius search. A slug (not free text) — the
   * combobox only emits one the places endpoint resolved, and the API ignores
   * anything unresolvable. Radius is left at the API default (50km).
   */
  location?: string;
  /** Human label for `location`, so the combobox rehydrates on a cold load. */
  locationName?: string;
  /** 1-based page; page 1 drops from the URL (clean canonical). */
  page?: number;
}

const COMPANY_JOBS_PAGE_SIZE = 20;

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/companies/$companySlug/jobs/')({
  // Full-bleed: the shared company-section shell owns the page container +
  // breadcrumb placement (the shell header is the hero here — no centered
  // shared company header band — matching /companies + /companies/…/salaries).
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: (search: Record<string, unknown>): CompanyJobsSearch => ({
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
    location:
      typeof search.location === 'string' && search.location
        ? search.location
        : undefined,
    locationName:
      typeof search.locationName === 'string' && search.locationName
        ? search.locationName
        : undefined,
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    try {
      const company = await getCompany({
        data: { companySlug: params.companySlug },
      });
      const offset = pageToOffset(deps.page ?? 1, COMPANY_JOBS_PAGE_SIZE);
      const pageData = await getCompanyJobsPage({
        data: {
          companySlug: company.slug,
          companyName: company.name,
          q: deps.q,
          location: deps.location,
          offset,
          limit: COMPANY_JOBS_PAGE_SIZE,
        },
      });
      return {
        company,
        ...pageData,
        q: deps.q ?? null,
        location: deps.location ?? null,
        locationName: deps.locationName ?? null,
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
  component: CompanyJobsPage,
  notFoundComponent: () => (
    <p className="bg-card text-muted-foreground ring-border rounded-xl p-10 text-center ring-1">
      {m.companyDetail_notFoundText()}
    </p>
  ),
});

function CompanyJobsPage() {
  const { company, page, q, location, locationName, hasSalaries } =
    Route.useLoaderData();
  const search = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const locationSuggestions = useLocationSuggestions(board.language);
  const navigate = Route.useNavigate();
  const currentHref = useLocation({ select: (loc) => loc.href });

  const currentPage = search.page ?? 1;
  const count = page.count ?? 0;

  // Honest "Showing X–Y of Z" / "N jobs" count, reusing the browse copy keys.
  const showRange = count > COMPANY_JOBS_PAGE_SIZE;
  const countLabel = showRange
    ? m.jobSearch_resultsShowingRange({
        from: ((currentPage - 1) * COMPANY_JOBS_PAGE_SIZE + 1).toLocaleString(
          board.language,
        ),
        to: Math.min(
          currentPage * COMPANY_JOBS_PAGE_SIZE,
          count,
        ).toLocaleString(board.language),
        count: count.toLocaleString(board.language),
      })
    : count === 1
      ? m.jobSearch_resultsCountOne({
          count: count.toLocaleString(board.language),
        })
      : m.jobSearch_resultsCountMany({
          count: count.toLocaleString(board.language),
        });

  return (
    <CompanySectionShell
      company={company}
      activeSection="jobs"
      jobCount={company.publishedJobCount}
      hasSalaries={hasSalaries}
    >
      {/* The shared company header IS the hero here (no doubled-up centered
          listing hero); the search band stays, above the honest count + rows. */}
      <CompanyJobsSearchBar
        companySlug={company.slug}
        defaultValue={q ?? undefined}
        location={
          location ? { slug: location, name: locationName ?? '' } : null
        }
        locationSuggestions={locationSuggestions}
      />

      <div data-pagination-scroll-target className="space-y-8">
        <p className="text-foreground text-base font-semibold">{countLabel}</p>

        <JobList
          jobs={page.data.map((job) =>
            toJobCardVM(job, board.language, board.labels),
          )}
          language={board.language}
          labels={board.labels}
          variant="grid"
          compact
        />

        <ListingPagination
          page={currentPage}
          count={count}
          pageSize={COMPANY_JOBS_PAGE_SIZE}
          hrefForPage={(nextPage) => listingPageHref(currentHref, nextPage)}
          onPageChange={(next) =>
            navigate({
              search: (prev) => ({ ...prev, page: pageSearchValue(next) }),
            })
          }
        />
      </div>
    </CompanySectionShell>
  );
}
