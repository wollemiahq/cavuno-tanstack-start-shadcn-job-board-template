import { useNavigate } from "@tanstack/react-router";

import type { PublicCompany } from "@cavuno/board";

import type { BreadcrumbData } from "@/components/board/breadcrumb";
import { CompanySearchPage } from "@/components/board/company-search-page";
import {
  includeSelectedCompanyMarket,
  type CompaniesSearch,
} from "@/lib/companies-search";
import { pageSearchValue } from "@/lib/pagination";
import { SelectedCompanyDetail } from "@/routes/-selected-company-detail";
import { useSelectedCompany } from "@/routes/-use-selected-company";

type LooseNavigate = (options: {
  to?: string;
  params?: Record<string, string>;
  search?: (previous: Record<string, unknown>) => Record<string, unknown>;
  replace?: boolean;
  resetScroll?: boolean;
}) => void;

export type CompaniesPageData = {
  data: PublicCompany[];
  count?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export function ProgrammaticCompaniesView({
  heading,
  description,
  breadcrumb,
  page,
  pageSize,
  markets,
  market,
  search,
}: {
  heading: string;
  description?: string;
  breadcrumb?: BreadcrumbData;
  page: CompaniesPageData;
  pageSize: number;
  markets: Array<{ slug: string; name: string }>;
  market?: { slug: string; name: string };
  search: CompaniesSearch;
}) {
  const navigate = useNavigate() as unknown as LooseNavigate;
  const marketOptions = includeSelectedCompanyMarket(markets, market);
  const selectedCompany = useSelectedCompany(
    page.data.some((company) => company.slug === search.selectedCompany)
      ? search.selectedCompany
      : undefined
  );

  const navigateToMarket = (marketSlug: string | undefined, query: string) => {
    const nextSearch = () => ({
      query: query.trim() || undefined,
      cursor: undefined,
      page: undefined,
      selectedCompany: undefined,
    });

    if (marketSlug) {
      navigate({
        to: "/companies/markets/$market",
        params: { market: marketSlug },
        search: nextSearch,
      });
      return;
    }

    navigate({ to: "/companies", search: nextSearch });
  };

  return (
    <CompanySearchPage
      companies={page.data}
      count={page.count ?? page.data.length}
      page={search.page ?? 1}
      pageSize={pageSize}
      heading={heading}
      description={description}
      breadcrumb={breadcrumb}
      query={search.query}
      marketSlug={market?.slug}
      markets={marketOptions}
      onSearchSubmit={(query) => {
        const nextSearch = () => ({
          query: query.trim() || undefined,
          cursor: undefined,
          page: undefined,
          selectedCompany: undefined,
        });

        if (market) {
          navigate({
            to: "/companies/markets/$market",
            params: { market: market.slug },
            search: nextSearch,
          });
          return;
        }

        navigate({ to: "/companies", search: nextSearch });
      }}
      onMarketChange={navigateToMarket}
      onPageChange={(nextPage) =>
        navigate({
          search: (previous) => ({
            ...previous,
            page: pageSearchValue(nextPage),
            cursor: undefined,
            selectedCompany: undefined,
          }),
        })
      }
      hasMore={page.hasMore}
      onLoadMore={
        page.hasMore && page.nextCursor
          ? () =>
              navigate({
                search: (previous) => ({
                  ...previous,
                  cursor: page.nextCursor ?? undefined,
                  page: undefined,
                  selectedCompany: undefined,
                }),
              })
          : undefined
      }
      selectedCompany={search.selectedCompany}
      onSelectedCompanyReplace={(companySlug) =>
        navigate({
          search: (previous) => ({ ...previous, selectedCompany: companySlug }),
          replace: true,
          resetScroll: false,
        })
      }
      onSelectedCompanyPush={(companySlug) =>
        navigate({
          search: (previous) => ({ ...previous, selectedCompany: companySlug }),
          resetScroll: false,
        })
      }
      detail={<SelectedCompanyDetail state={selectedCompany} />}
    />
  );
}
