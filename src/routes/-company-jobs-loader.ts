import { isNotFound } from '@cavuno/board';
import { notFound } from '@tanstack/react-router';

import { pageToOffset } from '@/lib/pagination';
import { getCompanyJobsPage } from '@/server/companies-pages';

export interface CompanyJobsSearch {
  q?: string;
  location?: string;
  locationName?: string;
  page?: number;
}

export const COMPANY_JOBS_PAGE_SIZE = 20;

export function createCompanyJobsLoader(
  loadPage: typeof getCompanyJobsPage = getCompanyJobsPage,
) {
  return async ({
    params,
    deps,
  }: {
    params: { companySlug: string };
    deps: CompanyJobsSearch;
  }) => {
    try {
      const offset = pageToOffset(deps.page ?? 1, COMPANY_JOBS_PAGE_SIZE);
      const pageData = await loadPage({
        data: {
          companySlug: params.companySlug,
          q: deps.q,
          location: deps.location,
          offset,
          limit: COMPANY_JOBS_PAGE_SIZE,
        },
      });
      return {
        ...pageData,
        q: deps.q ?? null,
        location: deps.location ?? null,
        locationName: deps.locationName ?? null,
      };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  };
}
