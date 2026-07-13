import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { Building02 } from "@untitledui/icons";

import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { AlertsBand } from "@/components/board/alerts-band";
import { CompanyCard } from "@/components/board/company-card";
import { ListingPageHeader } from "@/components/board/listing-page-header";
import { ListingPagination } from "@/components/board/listing-pagination";
import { ListingRail, railHasContent } from "@/components/board/listing-rail";
import { PageBody } from "@/components/board/page-body";
import { JsonLd } from "@/components/json-ld";
import { CompanySearchBar } from "../components/company-search-bar";
import { companyMarketPath } from "@cavuno/board/paths";
import { createBreadcrumbJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { pageSearchValue, pageToOffset, parsePageParam } from "../lib/pagination";
import { getCompanyMarkets, getSeoBase, listCompanies, searchCompanies, subscribeJobAlert } from "../server/queries";

/**
 * Two pagination modes on one surface (CAV-496): the BROWSE list offsets by
 * `?page=`, but the text SEARCH (`?query=`) rides `?cursor=` load-more — the
 * Board API's companies search endpoint has no `offset` (unlike jobs search),
 * so page numbers can't address a search result set. Submitting a new query
 * drops both `page` and `cursor`, resetting the mode cleanly.
 */
interface CompaniesSearch {
  cursor?: string;
  query?: string;
  /** 1-based page for the browse list; page 1 drops from the URL. */
  page?: number;
}

const COMPANIES_PAGE_SIZE = 24;

const rootApi = getRouteApi("__root__");

export const Route = createFileRoute("/companies/")({
  // Full-bleed: opens with the Lumen-style gray hero band (CAV-497).
  staticData: { fullBleed: true },
  validateSearch: (search: Record<string, unknown>): CompaniesSearch => ({
    cursor: typeof search.cursor === "string" && search.cursor ? search.cursor : undefined,
    query: typeof search.query === "string" && search.query ? search.query : undefined,
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [page, markets, seo] = await Promise.all([
      deps.query
        ? searchCompanies({
            data: { query: deps.query, cursor: deps.cursor, limit: COMPANIES_PAGE_SIZE },
          })
        : listCompanies({
            data: {
              offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
              limit: COMPANIES_PAGE_SIZE,
            },
          }),
      getCompanyMarkets({ data: { limit: 24 } }),
      getSeoBase(),
    ]);
    return { page, markets: markets.data, seo, query: deps.query ?? null };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: m.companiesIndex_metaTitle() },
            {
              name: "description",
              content: m.companiesIndex_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [{ rel: "canonical", href: `${loaderData.seo.origin}/companies` }],
        }
      : { meta: [{ title: m.companiesIndex_metaTitle() }] },
  component: CompaniesPage,
});

/** Pre-resolve the pluralized "N open job(s)" label (shared across company cards). */
function jobCountLabel(count: number) {
  return count === 1
    ? m.companyDetail_openJobsCountOne({ count })
    : m.companyDetail_openJobsCountMany({ count });
}

function CompaniesPage() {
  const { page, markets, seo, query } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/companies/" });
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;

  const jsonLd = [
    createBreadcrumbJsonLd([{ label: crumbs.home, href: seo.origin }, { label: crumbs.companies }]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  // Browse-by-market is the companies rail card (CAV-511) — always present (both
  // browse and search modes, unlike the browse-only `page.relatedSearches` it
  // supersedes), and the richest market-links set. Crawlable market anchors, the
  // SEO internal-linking spine into `/companies/markets/:slug`.
  const marketChips = markets.map((market) => ({
    key: market.slug,
    name: market.name,
    href: companyMarketPath(market.slug),
  }));
  const rail = railHasContent(undefined, marketChips) ? (
    <ListingRail relatedTitle={m.companiesIndex_browseByMarketHeading()} relatedChips={marketChips} />
  ) : undefined;

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageBody
        band={
          <ListingPageHeader
            breadcrumb={{
              ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
              items: [{ name: crumbs.home, href: "/" }, { name: crumbs.companies }],
            }}
            title={m.companiesIndex_metaTitle()}
            subtitle={m.companiesIndex_metaDescription({ boardName: seo.boardName })}
            search={<CompanySearchBar defaultValue={query ?? undefined} />}
          />
        }
        rail={rail}
      >
      {page.data.length === 0 ? (
        <EmptyState size="sm" className="py-12">
          <EmptyState.Header>
            <EmptyState.FeaturedIcon icon={Building02} color="gray" theme="modern" />
          </EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>{m.companiesIndex_metaTitle()}</EmptyState.Title>
            <EmptyState.Description>
              {query ? m.companiesIndex_noMatchText({ query }) : m.companiesIndex_emptyText()}
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {page.data.map((company) => (
            <CompanyCard
              key={company.id}
              companySlug={company.slug}
              name={company.name}
              logoUrl={company.logoUrl}
              description={company.description}
              publishedJobCount={company.publishedJobCount}
              jobCountLabel={jobCountLabel(company.publishedJobCount)}
            />
          ))}
        </div>
      )}

      {query ? (
        // Text search rides cursor load-more — the companies search endpoint
        // has no `offset`, so page numbers can't address the result set.
        page.hasMore && page.nextCursor ? (
          <div className="flex justify-center">
            <Button
              color="secondary"
              size="lg"
              onClick={() =>
                navigate({
                  to: "/companies",
                  search: (prev) => ({ ...prev, cursor: page.nextCursor ?? undefined }),
                })
              }
            >
              {m.companiesIndex_loadMoreLabel()}
            </Button>
          </div>
        ) : null
      ) : (
        <ListingPagination
          page={search.page ?? 1}
          count={page.count ?? 0}
          pageSize={COMPANIES_PAGE_SIZE}
          onPageChange={(next) =>
            navigate({
              to: "/companies",
              search: (prev) => ({ ...prev, page: pageSearchValue(next) }),
            })
          }
        />
      )}
      </PageBody>

      {board.features.jobAlerts ? (
        <AlertsBand
          language={board.language}
          labels={board.labels}
          source="companies_list"
          onSubscribe={async (input) => {
            const result = await subscribeJobAlert({ data: input });
            return { status: result.status };
          }}
        />
      ) : null}
    </>
  );
}
