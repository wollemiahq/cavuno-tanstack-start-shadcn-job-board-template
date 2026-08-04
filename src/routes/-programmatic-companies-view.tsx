import { getRouteApi, useNavigate } from '@tanstack/react-router';

import { getCompanySearchLabels } from '@/board/company-search-labels';
import { toCompanyCardVM } from '@/board/company-view-model';
import { CompanySearchPage } from '@/components/board/company-search-page';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { jobDetailCopy } from '@/copy-groups/job-detail';
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
  const copy = {
    breadcrumbs: breadcrumbsCopy(board.language),
    jobDetail: jobDetailCopy(board.language),
  };
  const marketOptions = includeSelectedCompanyMarket(markets, market);
  const selectedCompany = useSelectedCompany(
    page.data.some((company) => company.slug === search.selectedCompany)
      ? search.selectedCompany
      : undefined,
  );

  const companyLabels = getCompanySearchLabels();

  return (
    <CompanySearchPage
      companies={page.data.map((company) =>
        toCompanyCardVM(company, companyLabels),
      )}
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
            selectedCompany: undefined,
          }),
        })
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
        />
      }
    />
  );
}
