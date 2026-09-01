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
import { pageSearchValue, type UrlSearchInput } from '@/lib/pagination';
import { getLocale } from '@/paraglide/runtime';
import { SelectedCompanyDetail } from '@/routes/-selected-company-detail';
import { useSelectedCompany } from '@/routes/-use-selected-company';
import type { PublicCompany } from '@cavuno/board';

const rootApi = getRouteApi('__root__');

type LooseNavigate = (options: {
  to?: string;
  params?: Record<string, string>;
  search?: (previous: UrlSearchInput) => UrlSearchInput;
  replace?: boolean;
  resetScroll?: boolean;
}) => void;

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
  searchUnavailable,
}: {
  heading: string;
  page: CompaniesPageData;
  pageSize: number;
  markets: Array<{ slug: string; name: string }>;
  market?: { slug: string; name: string };
  search: CompaniesSearch;
  searchUnavailable?: boolean;
}) {
  const { board } = rootApi.useLoaderData();
  const routeNavigate = useNavigate();
  // SAFETY: This component only uses stable search-object updates supported by
  // TanStack navigate; route-specific typing is erased at this shared view seam.
  const navigate = routeNavigate as LooseNavigate;
  const copy = {
    breadcrumbs: breadcrumbsCopy(),
    jobDetail: jobDetailCopy(),
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
      ads={board.ads}
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
      searchUnavailable={searchUnavailable}
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
          language={getLocale()}
          jobForm={board}
        />
      }
    />
  );
}
