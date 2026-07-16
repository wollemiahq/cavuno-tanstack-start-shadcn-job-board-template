import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
/**
 * Company jobs subpage (CAV-501) — every open job at one company, with a
 * keyword search and page-based pagination. The `/companies/:slug/jobs/`
 * index sits alongside the job-detail route (`…/jobs/:jobSlug`) without
 * shadowing it (TanStack matches the exact index path).
 *
 * Honest pagination + search, both server-side: the jobs SEARCH endpoint
 * (`filters.companyId`) narrows a free-text query to this company and
 * accepts `offset`, so the `?page=` numbered nav addresses the result set;
 * with no query the BROWSE list (`companyId` + `offset`) does the same.
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
import { useLocationSuggestions } from './-use-location-suggestions';
import {
  listingPageHref,
  pageSearchValue,
  pageToOffset,
  parsePageParam,
} from '../lib/pagination';
import { m } from '../paraglide/messages';
import {
  getCompany,
  getCompanySalaryPresence,
  getSeoBase,
  listJobs,
  searchJobs,
} from '../server/queries';

import { CompanySectionShell } from '@/components/board/company-section-header';
import { JobList } from '@/components/board/job-list';
import { ListingPagination } from '@/components/board/listing-pagination';
import { JsonLd } from '@/components/json-ld';

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
  // ListingPageHeader band — matching /companies + /companies/…/salaries).
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
      // `location` is a place slug the API geo-resolves; it rides the SEARCH
      // endpoint's `filters` and the BROWSE endpoint's top level, so it narrows
      // with or without a keyword.
      const [page, seo, hasSalaries] = await Promise.all([
        deps.q
          ? searchJobs({
              data: {
                query: deps.q,
                filters: {
                  companyId: [company.id],
                  ...(deps.location ? { location: deps.location } : {}),
                },
                offset,
                limit: COMPANY_JOBS_PAGE_SIZE,
              },
            })
          : listJobs({
              data: {
                companyId: [company.id],
                ...(deps.location ? { location: deps.location } : {}),
                offset,
                limit: COMPANY_JOBS_PAGE_SIZE,
              },
            }),
        getSeoBase(),
        getCompanySalaryPresence({ data: { companySlug: params.companySlug } }),
      ]);
      return {
        company,
        page,
        seo,
        q: deps.q ?? null,
        location: deps.location ?? null,
        locationName: deps.locationName ?? null,
        hasSalaries,
      };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.companyJobs_metaTitle({
                company: loaderData.company.name,
                boardName: loaderData.seo.boardName,
              }),
            },
            {
              name: 'description',
              content: m.companyJobs_metaDescription({
                company: loaderData.company.name,
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/companies/${loaderData.company.slug}/jobs`,
            },
          ],
        }
      : {},
  component: CompanyJobsPage,
  notFoundComponent: () => (
    <p className="bg-card text-muted-foreground ring-border rounded-xl p-10 text-center ring-1">
      {m.companyDetail_notFoundText()}
    </p>
  ),
});

function CompanyJobsPage() {
  const { company, page, seo, q, location, locationName, hasSalaries } =
    Route.useLoaderData();
  const search = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const locationSuggestions = useLocationSuggestions(board.language);
  const navigate = Route.useNavigate();
  const currentHref = useLocation({ select: (location) => location.href });
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;

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

  // The trail locates the ENTITY and stops there (Home → Companies →
  // {Company}) — IDENTICAL to the profile + salaries tabs; the tab row alone
  // says we are on Jobs. The BreadcrumbList JSON-LD mirrors the visible trail.
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.companies, href: `${seo.origin}/companies` },
      { label: company.name },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  return (
    <CompanySectionShell
      company={company}
      activeSection="jobs"
      jobCount={company.publishedJobCount}
      hasSalaries={hasSalaries}
    >
      <JsonLd data={jsonLd} />

      {/* The shared company header IS the hero here (no doubled-up centered
          listing hero); the search band stays, above the honest count + rows. */}
      <CompanyJobsSearchBar
        companySlug={company.slug}
        defaultValue={q ?? undefined}
        location={location ? { slug: location, name: locationName ?? '' } : null}
        locationSuggestions={locationSuggestions}
      />

      <p className="text-foreground text-base font-semibold">{countLabel}</p>

      <JobList
        jobs={page.data}
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
    </CompanySectionShell>
  );
}
