import { isNotFound } from '@cavuno/board';

import { followManagedRedirect, requestedPath } from './-catch-all-loader';

import { pageToOffset } from '@/lib/pagination';
import { getCompanyJobsPage } from '@/server/companies-pages';
import { resolveRedirect } from '@/server/queries';

export interface CompanyJobsSearch {
  q?: string;
  location?: string;
  locationName?: string;
  page?: number;
}

export const COMPANY_JOBS_PAGE_SIZE = 20;

export function createCompanyJobsLoader(
  loadPage: typeof getCompanyJobsPage = getCompanyJobsPage,
  resolve: typeof resolveRedirect = resolveRedirect,
) {
  return async ({
    params,
    deps,
    location,
  }: {
    params: { companySlug: string };
    deps: CompanyJobsSearch;
    location: { publicHref: string };
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
      if (isNotFound(error))
        return followManagedRedirect(resolve, requestedPath(location));
      throw error;
    }
  };
}
