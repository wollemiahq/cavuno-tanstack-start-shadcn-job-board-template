import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createJobDetailLoader,
  type JobDetailLoaderDependencies,
} from './-job-detail-loader';
import {
  applicationFixture,
  publicCompanyFixture,
  publicJobFixture,
} from './-route-test-fixtures';

import type { PublicJobCard } from '@cavuno/board';

const getCompany = vi.fn<JobDetailLoaderDependencies['getCompany']>();
const getJobDetailPage =
  vi.fn<JobDetailLoaderDependencies['getJobDetailPage']>();
const getSessionUser = vi.fn<JobDetailLoaderDependencies['getSessionUser']>();
const getSimilarJobs = vi.fn<JobDetailLoaderDependencies['getSimilarJobs']>();
const myApplicationForJob =
  vi.fn<JobDetailLoaderDependencies['myApplicationForJob']>();
const dependencies: JobDetailLoaderDependencies = {
  getCompany,
  getJobDetailPage,
  getSessionUser,
  getSimilarJobs,
  myApplicationForJob,
};
const loadJobDetail = createJobDetailLoader(dependencies);

function jobDetailLoaderInput() {
  return {
    params: { companySlug: 'acme', jobSlug: 'platform-engineer' },
  };
}

beforeEach(() => {
  const similarJobs: PublicJobCard[] = [];
  getJobDetailPage.mockReset();
  getSessionUser.mockReset();
  getSimilarJobs.mockReset();
  getCompany.mockReset();
  myApplicationForJob.mockReset();
  getJobDetailPage.mockResolvedValue({
    job: publicJobFixture('platform-engineer'),
    seo: {
      origin: 'https://board.example',
      boardName: 'Board',
      language: 'en',
    },
    head: { meta: [], links: [] },
    jsonLd: [],
  });
  getSessionUser.mockResolvedValue({
    id: 'user-1',
    object: 'board_user',
    role: 'candidate',
    email: 'candidate@example.com',
    displayName: null,
    emailVerified: true,
    hasPassword: true,
  });
  getSimilarJobs.mockResolvedValue({
    object: 'list',
    url: '/v1/jobs/similar',
    data: similarJobs,
    hasMore: false,
    nextCursor: null,
  });
  getCompany.mockResolvedValue(publicCompanyFixture('acme'));
  myApplicationForJob.mockResolvedValue(applicationFixture());
});

describe('full job application state', () => {
  it('loads prior application state for a verified returning candidate', async () => {
    const data = await loadJobDetail(jobDetailLoaderInput());

    expect(myApplicationForJob).toHaveBeenCalledWith({
      data: { jobSlug: 'platform-engineer' },
    });
    expect(data).toMatchObject({ alreadyApplied: true });
  });

  it('does not request private application state for an unverified viewer', async () => {
    getSessionUser.mockResolvedValue({
      id: 'user-1',
      object: 'board_user',
      role: 'candidate',
      email: 'candidate@example.com',
      displayName: null,
      emailVerified: false,
      hasPassword: true,
    });

    const data = await loadJobDetail(jobDetailLoaderInput());

    expect(myApplicationForJob).not.toHaveBeenCalled();
    expect(data).toMatchObject({ alreadyApplied: false });
  });

  it('keeps a valid public job available when private application state fails', async () => {
    myApplicationForJob.mockRejectedValue(
      new Error('Private state unavailable'),
    );

    const data = await loadJobDetail(jobDetailLoaderInput());

    expect(data).toMatchObject({
      job: { slug: 'platform-engineer' },
      alreadyApplied: false,
    });
  });
});
