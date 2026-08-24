import { isNotFound, type PublicJobCard } from '@cavuno/board';
import { notFound } from '@tanstack/react-router';

import { getSessionUser } from '@/server/account';
import { myApplicationForJob } from '@/server/applications';
import { getJobDetailPage } from '@/server/job-detail-page';
import { getCompany, getSimilarJobs } from '@/server/queries';

type SimilarJobsResult = { jobs: PublicJobCard[] };

export type JobDetailLoaderDependencies = {
  getCompany: typeof getCompany;
  getJobDetailPage: typeof getJobDetailPage;
  getSessionUser: typeof getSessionUser;
  getSimilarJobs: typeof getSimilarJobs;
  myApplicationForJob: typeof myApplicationForJob;
};

const defaultDependencies: JobDetailLoaderDependencies = {
  getCompany,
  getJobDetailPage,
  getSessionUser,
  getSimilarJobs,
  myApplicationForJob,
};

export function createJobDetailLoader(
  dependencies: JobDetailLoaderDependencies = defaultDependencies,
) {
  return async ({
    params,
  }: {
    params: { companySlug: string; jobSlug: string };
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
          application: user?.emailVerified
            ? await dependencies
                .myApplicationForJob({ data: { jobSlug: params.jobSlug } })
                .catch(() => null)
            : null,
        })),
        dependencies
          .getCompany({ data: { companySlug: params.companySlug } })
          .catch(() => null),
      ]);
      const { user, application } = session;
      return {
        job: page.job,
        user,
        similar,
        companySummary: company?.summary ?? null,
        seo: page.seo,
        head: page.head,
        jsonLd: page.jsonLd,
        alreadyApplied: application !== null,
      };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  };
}
