import { isNotFound } from '@cavuno/board';

import { followManagedRedirect, requestedPath } from './-catch-all-loader';

import { getCompanyProfilePage } from '@/server/companies-pages';
import { getSimilarCompanies, resolveRedirect } from '@/server/queries';

export type CompanyProfileLoaderDependencies = {
  getCompanyProfilePage: typeof getCompanyProfilePage;
  getSimilarCompanies: typeof getSimilarCompanies;
  resolveRedirect: typeof resolveRedirect;
};

const defaultDependencies: CompanyProfileLoaderDependencies = {
  getCompanyProfilePage,
  getSimilarCompanies,
  resolveRedirect,
};

/**
 * The company profile loader: the page renders, or a missing company asks
 * the board's managed redirects for the requested URL before it 404s.
 */
export function createCompanyProfileLoader(
  dependencies: CompanyProfileLoaderDependencies = defaultDependencies,
) {
  return async ({
    params,
    location,
  }: {
    params: { companySlug: string };
    location: { publicHref: string };
  }) => {
    try {
      // ONE server fn: company, jobs, salary gate and SEO base resolve in a
      // single parallel batch server-side (see getCompanyProfilePage). The
      // old shape awaited a three-read Promise.all and THEN an SEO call,
      // serializing a second wave just to build head tags.
      // Similar companies is a below-the-fold, search-backed rail. It needs
      // only the slug, so it is kicked off BEFORE the page batch is awaited —
      // starting it after made it a second serial wave, and SSR renders the
      // rail into the document, so "deferred" did not keep it off the
      // first-byte path. Now it overlaps the four page reads instead.
      // Degrades to empty, never fatal.
      const similar = dependencies
        .getSimilarCompanies({
          data: { companySlug: params.companySlug, limit: 6 },
        })
        .then((r) => r.data)
        .catch(() => []);
      const pageData = await dependencies.getCompanyProfilePage({
        data: { companySlug: params.companySlug },
      });
      return { ...pageData, similar };
    } catch (error) {
      if (isNotFound(error))
        return followManagedRedirect(
          dependencies.resolveRedirect,
          requestedPath(location),
        );
      throw error;
    }
  };
}
