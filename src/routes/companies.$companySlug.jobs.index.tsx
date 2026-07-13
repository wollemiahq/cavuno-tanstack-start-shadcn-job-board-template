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
import { createFileRoute, getRouteApi, notFound } from "@tanstack/react-router";

import { isNotFound } from "@cavuno/board";
import { createBreadcrumbJsonLd } from "@cavuno/board/seo";

import { CompanySectionShell } from "@/components/board/company-section-header";
import { JobList } from "@/components/board/job-list";
import { ListingPagination } from "@/components/board/listing-pagination";
import { JsonLd } from "@/components/json-ld";
import { CompanyJobsSearchBar } from "../components/company-jobs-search-bar";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { pageSearchValue, pageToOffset, parsePageParam } from "../lib/pagination";
import {
  getCompany,
  getCompanySalaryPresence,
  getSeoBase,
  listJobs,
  searchJobs,
} from "../server/queries";

interface CompanyJobsSearch {
  /** Free-text keyword, scoped to this company via the jobs search endpoint. */
  q?: string;
  /** 1-based page; page 1 drops from the URL (clean canonical). */
  page?: number;
}

const COMPANY_JOBS_PAGE_SIZE = 20;

const rootApi = getRouteApi("__root__");

export const Route = createFileRoute("/companies/$companySlug/jobs/")({
  // Full-bleed: the shared company-section shell owns the page container +
  // breadcrumb placement (the shell header is the hero here — no centered
  // ListingPageHeader band — matching /companies + /companies/…/salaries).
  staticData: { fullBleed: true },
  validateSearch: (search: Record<string, unknown>): CompanyJobsSearch => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    try {
      const company = await getCompany({ data: { companySlug: params.companySlug } });
      const offset = pageToOffset(deps.page ?? 1, COMPANY_JOBS_PAGE_SIZE);
      const [page, seo, hasSalaries] = await Promise.all([
        deps.q
          ? searchJobs({
              data: {
                query: deps.q,
                filters: { companyId: [company.id] },
                offset,
                limit: COMPANY_JOBS_PAGE_SIZE,
              },
            })
          : listJobs({
              data: {
                companyId: [company.id],
                offset,
                limit: COMPANY_JOBS_PAGE_SIZE,
              },
            }),
        getSeoBase(),
        getCompanySalaryPresence({ data: { companySlug: params.companySlug } }),
      ]);
      return { company, page, seo, q: deps.q ?? null, hasSalaries };
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
              name: "description",
              content: m.companyJobs_metaDescription({
                company: loaderData.company.name,
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: "canonical",
              href: `${loaderData.seo.origin}/companies/${loaderData.company.slug}/jobs`,
            },
          ],
        }
      : {},
  component: CompanyJobsPage,
  notFoundComponent: () => (
    <p className="rounded-xl bg-primary p-10 text-center text-tertiary ring-1 ring-secondary_alt">
      {m.companyDetail_notFoundText()}
    </p>
  ),
});

function CompanyJobsPage() {
  const { company, page, seo, q, hasSalaries } = Route.useLoaderData();
  const search = Route.useSearch();
  const { board } = rootApi.useLoaderData();
  const navigate = Route.useNavigate();
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;

  const currentPage = search.page ?? 1;
  const count = page.count ?? 0;

  // Honest "Showing X–Y of Z" / "N jobs" count, reusing the browse copy keys.
  const showRange = count > COMPANY_JOBS_PAGE_SIZE;
  const countLabel = showRange
    ? m.jobSearch_resultsShowingRange({
        from: ((currentPage - 1) * COMPANY_JOBS_PAGE_SIZE + 1).toLocaleString(board.language),
        to: Math.min(currentPage * COMPANY_JOBS_PAGE_SIZE, count).toLocaleString(board.language),
        count: count.toLocaleString(board.language),
      })
    : count === 1
      ? m.jobSearch_resultsCountOne({ count: count.toLocaleString(board.language) })
      : m.jobSearch_resultsCountMany({ count: count.toLocaleString(board.language) });

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
      breadcrumb={{
        ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
        items: [
          { name: crumbs.home, href: "/" },
          { name: crumbs.companies, href: "/companies" },
          { name: company.name },
        ],
      }}
      company={company}
      activeSection="jobs"
      jobCount={company.publishedJobCount}
      hasSalaries={hasSalaries}
    >
      <JsonLd data={jsonLd} />

      {/* The shared company header IS the hero here (no doubled-up centered
          listing hero); the search band stays, above the honest count + rows. */}
      <CompanyJobsSearchBar companySlug={company.slug} defaultValue={q ?? undefined} />

      <p className="text-md font-semibold text-primary">{countLabel}</p>

      <JobList jobs={page.data} language={board.language} labels={board.labels} variant="grid" />

      <ListingPagination
        page={currentPage}
        count={count}
        pageSize={COMPANY_JOBS_PAGE_SIZE}
        onPageChange={(next) =>
          navigate({ search: (prev) => ({ ...prev, page: pageSearchValue(next) }) })
        }
      />
    </CompanySectionShell>
  );
}
