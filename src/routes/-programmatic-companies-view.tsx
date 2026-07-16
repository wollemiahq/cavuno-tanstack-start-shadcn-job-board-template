import { boardCopy } from '#/copy';

import { getRouteApi, useNavigate } from '@tanstack/react-router';

import { CompanySearchPage } from '@/components/board/company-search-page';
import {
  includeSelectedCompanyMarket,
  type CompaniesSearch,
} from '@/lib/companies-search';
import { pageSearchValue } from '@/lib/pagination';
import { SelectedCompanyDetail } from '@/routes/-selected-company-detail';
import { useSelectedCompany } from '@/routes/-use-selected-company';
import type { PublicCompany } from '@cavuno/board';

type LooseNavigate = (options: {
  to?: string;
  params?: Record<string, string>;
  search?: (previous: Record<string, unknown>) => Record<string, unknown>;
  replace?: boolean;
  resetScroll?: boolean;
}) => void;

const rootApi = getRouteApi('__root__');

export type CompaniesPageData = {
  data: PublicCompany[];
  count?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export function ProgrammaticCompaniesView({
  heading,
  page,
  pageSize,
  markets,
  market,
  search,
}: {
  heading: string;
  page: CompaniesPageData;
  pageSize: number;
  markets: Array<{ slug: string; name: string }>;
  market?: { slug: string; name: string };
  search: CompaniesSearch;
}) {
  const navigate = useNavigate() as unknown as LooseNavigate;
  const { board } = rootApi.useLoaderData();
  const copy = boardCopy(board.language, board.labels);
  const marketOptions = includeSelectedCompanyMarket(markets, market);
  const selectedCompany = useSelectedCompany(
    page.data.some((company) => company.slug === search.selectedCompany)
      ? search.selectedCompany
      : undefined,
  );

  return (
    <CompanySearchPage
      companies={page.data}
      count={page.count ?? page.data.length}
      page={search.page ?? 1}
      pageSize={pageSize}
      heading={heading}
      breadcrumb={
        market
          ? {
              ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
              items: [
                { name: copy.breadcrumbs.companies, href: '/companies' },
                { name: heading },
              ],
            }
          : undefined
      }
      query={search.query}
      markets={marketOptions}
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
      detail={
        <SelectedCompanyDetail
          state={selectedCompany}
          language={board.language}
          labels={board.labels}
        />
      }
    />
  );
}
