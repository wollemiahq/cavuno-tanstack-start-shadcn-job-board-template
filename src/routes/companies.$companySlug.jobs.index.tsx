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
  useLocation,
} from '@tanstack/react-router';

import { CompanyJobsSearchBar } from '../components/company-jobs-search-bar';
import {
  listingPageHref,
  pageSearchValue,
  parsePageParam,
  searchString,
  type UrlSearchInput,
} from '../lib/pagination';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import {
  COMPANY_JOBS_PAGE_SIZE,
  createCompanyJobsLoader,
  type CompanyJobsSearch,
} from './-company-jobs-loader';
import { useLocationSuggestions } from './-use-location-suggestions';

import { toJobCardVM } from '@/board/job-view-model';
import { CompanySectionShell } from '@/components/board/company-section-header';
import { JobList } from '@/components/board/job-list';
import { ListingPagination } from '@/components/board/listing-pagination';
import { jsonLdHeadScripts } from '@/components/json-ld';

export const Route = createFileRoute('/companies/$companySlug/jobs/')({
  // Full-bleed: the shared company-section shell owns the page container +
  // breadcrumb placement (the shell header is the hero here — no centered
  // shared company header band — matching /companies + /companies/…/salaries).
  staticData: { fullBleed: true, ownsMain: true },
  validateSearch: (search: UrlSearchInput): CompanyJobsSearch => ({
    q: searchString(search.q),
    location: searchString(search.location),
    locationName: searchString(search.locationName),
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: createCompanyJobsLoader(),
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

const rootApi = getRouteApi('__root__');

function CompanyJobsPage() {
  const { company, page, q, location, locationName, hasSalaries } =
    Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const search = Route.useSearch();
  const locationSuggestions = useLocationSuggestions(getLocale());
  const navigate = Route.useNavigate();
  const currentHref = useLocation({ select: (loc) => loc.href });

  const currentPage = search.page ?? 1;
  const count = page.count ?? 0;
  const locale = getLocale();

  // Honest "Showing X–Y of Z" / "N jobs" count, reusing the browse copy keys.
  const showRange = count > COMPANY_JOBS_PAGE_SIZE;
  const countLabel = showRange
    ? m.jobSearch_resultsShowingRange({
        from: ((currentPage - 1) * COMPANY_JOBS_PAGE_SIZE + 1).toLocaleString(
          locale,
        ),
        to: Math.min(
          currentPage * COMPANY_JOBS_PAGE_SIZE,
          count,
        ).toLocaleString(locale),
        count: count.toLocaleString(locale),
      })
    : new Intl.PluralRules(locale).select(count) === 'one'
      ? m.jobSearch_resultsCountOne({
          count: count.toLocaleString(locale),
        })
      : m.jobSearch_resultsCountMany({
          count: count.toLocaleString(locale),
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
          jobs={page.data.map((job) => toJobCardVM(job, getLocale(), board))}
          language={getLocale()}
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
