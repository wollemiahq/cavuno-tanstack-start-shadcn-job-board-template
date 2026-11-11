import { isNotFound, type PublicJobCard } from '@cavuno/board';
import { jobDetailPath } from '@cavuno/board/paths';
import { redirect } from '@tanstack/react-router';

import { followManagedRedirect, requestedPath } from './-catch-all-loader';

import { getSessionUser } from '@/server/account';
import { myApplicationForJob } from '@/server/applications';
import { getJobDetailPage } from '@/server/job-detail-page';
import { getCompany, getSimilarJobs, resolveRedirect } from '@/server/queries';

type SimilarJobsResult = { jobs: PublicJobCard[] };

export type JobDetailLoaderDependencies = {
  getCompany: typeof getCompany;
  getJobDetailPage: typeof getJobDetailPage;
  getSessionUser: typeof getSessionUser;
  getSimilarJobs: typeof getSimilarJobs;
  myApplicationForJob: typeof myApplicationForJob;
  resolveRedirect: typeof resolveRedirect;
};

const defaultDependencies: JobDetailLoaderDependencies = {
  getCompany,
  getJobDetailPage,
  getSessionUser,
  getSimilarJobs,
  myApplicationForJob,
  resolveRedirect,
};

export function createJobDetailLoader(
  dependencies: JobDetailLoaderDependencies = defaultDependencies,
) {
  return async ({
    params,
    location,
  }: {
    params: { companySlug: string; jobSlug: string };
    location: { publicHref: string };
  }) => {
    const noSimilarJobs = (): SimilarJobsResult => ({ jobs: [] });
    try {
      const similar = dependencies
        .getSimilarJobs({ data: { jobSlug: params.jobSlug } })
        .then((result) => ({ jobs: result.data }))
        .catch(noSimilarJobs);
      const [page, session, company] = await Promise.all([
        dependencies.getJobDetailPage({ data: { jobSlug: params.jobSlug } }),
        dependencies.getSessionUser().then(async (user) => ({
          user,
          applicationState: user?.emailVerified
            ? await dependencies
                .myApplicationForJob({ data: { jobSlug: params.jobSlug } })
                .then((application) =>
                  application === null
                    ? ('not-applied' as const)
                    : ('applied' as const),
                )
                .catch(() => 'unknown' as const)
            : ('not-requested' as const),
        })),
        dependencies
          .getCompany({ data: { companySlug: params.companySlug } })
          .catch(() => null),
      ]);
      const actualCompanySlug = page.job.company?.slug;
      if (
        actualCompanySlug &&
        page.job.slug &&
        actualCompanySlug !== params.companySlug
      )
        throw redirect({
          href: jobDetailPath(actualCompanySlug, page.job.slug),
          statusCode: 301,
        });
      const { user, applicationState } = session;
      return {
        job: page.job,
        user,
        similar,
        companySummary: company?.summary ?? null,
        companyMembershipPlanName: company?.membership?.planName ?? null,
        seo: page.seo,
        head: page.head,
        jsonLd: page.jsonLd,
        breadcrumbTrail: page.breadcrumbTrail,
        applicationState,
      };
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
