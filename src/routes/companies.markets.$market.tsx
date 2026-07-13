import { createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { Building02 } from "@untitledui/icons";

import { JsonLd } from "@/components/json-ld";
import { ListingPageHeader } from "@/components/board/listing-page-header";
import { PageBody } from "@/components/board/page-body";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { CompanyCard } from "@/components/board/company-card";
import { ListingPagination } from "@/components/board/listing-pagination";
import { createBreadcrumbJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { pageSearchValue, pageToOffset, parsePageParam } from "../lib/pagination";
import { getCompanyMarket, getSeoBase, listCompanies } from "../server/queries";

interface MarketSearch {
  /** 1-based page; page 1 drops from the URL (clean canonical). */
  page?: number;
}

const COMPANIES_PAGE_SIZE = 24;

export const Route = createFileRoute("/companies/markets/$market")({
  staticData: { fullBleed: true },
  validateSearch: (search: Record<string, unknown>): MarketSearch => ({
    page: pageSearchValue(parsePageParam(search.page)),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    // Resolve the (board-language or English) market slug: 404 if unknown, or
    // 308 to the canonical slug when the inbound one isn't canonical (CAV-291).
    const market = await getCompanyMarket({ data: { market: params.market } });
    if (!market) throw notFound();
    if (market.redirectTo) {
      throw redirect({
        to: "/companies/markets/$market",
        params: { market: market.redirectTo },
        statusCode: 308,
      });
    }
    // Browse by the inbound slug — the API resolves it to the English source
    // slug server-side and drives the companies list with it.
    const [page, seo] = await Promise.all([
      listCompanies({
        data: {
          marketSlug: params.market,
          offset: pageToOffset(deps.page ?? 1, COMPANIES_PAGE_SIZE),
          limit: COMPANIES_PAGE_SIZE,
        },
      }),
      getSeoBase(),
    ]);
    return { market, page, seo };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? {
          meta: [
            {
              title: m.marketPage_metaTitle({
                market: loaderData.market.displayName,
              }),
            },
            {
              name: "description",
              content: m.marketPage_metaDescription({
                market: loaderData.market.displayName,
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: "canonical",
              href: `${loaderData.seo.origin}/companies/markets/${params.market}`,
            },
          ],
        }
      : {},
  component: MarketPage,
  notFoundComponent: () => (
    <PageBody>
      <EmptyState size="sm" className="py-12">
        <EmptyState.Header>
          <EmptyState.FeaturedIcon icon={Building02} color="gray" theme="modern" />
        </EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>{m.marketPage_notFoundText()}</EmptyState.Title>
        </EmptyState.Content>
      </EmptyState>
    </PageBody>
  ),
});

/** Pre-resolve the pluralized "N open job(s)" label (shared across company cards). */
function jobCountLabel(count: number) {
  return count === 1
    ? m.companyDetail_openJobsCountOne({ count })
    : m.companyDetail_openJobsCountMany({ count });
}

function MarketPage() {
  const { market, page, seo } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/companies/markets/$market" });
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;

  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.companies, href: `${seo.origin}/companies` },
      { label: market.displayName },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageBody
        band={
          <ListingPageHeader
            breadcrumb={{
              ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
              items: [
                { name: crumbs.home, href: "/" },
                { name: crumbs.companies, href: "/companies" },
                { name: market.displayName },
              ],
            }}
            title={market.displayName}
          />
        }
      >
      {page.data.length === 0 ? (
        <EmptyState size="sm" className="py-12">
          <EmptyState.Header>
            <EmptyState.FeaturedIcon icon={Building02} color="gray" theme="modern" />
          </EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>{market.displayName}</EmptyState.Title>
            <EmptyState.Description>{m.marketPage_emptyText()}</EmptyState.Description>
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

      <ListingPagination
        page={search.page ?? 1}
        count={page.count ?? 0}
        pageSize={COMPANIES_PAGE_SIZE}
        onPageChange={(next) =>
          navigate({
            to: "/companies/markets/$market",
            search: (prev) => ({ ...prev, page: pageSearchValue(next) }),
          })
        }
      />
      </PageBody>
    </>
  );
}
