import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCompanyJobsLoader } from './-company-jobs-loader';
import { publicCompanyFixture } from './-route-test-fixtures';

import type { getCompanyJobsPage as GetCompanyJobsPage } from '../server/companies-pages';

const getCompanyJobsPage = vi.fn<typeof GetCompanyJobsPage>();
const loadCompanyJobs = createCompanyJobsLoader(getCompanyJobsPage);

function companyJobsLoaderContext(deps: {
  q?: string;
  location?: string;
  page?: number;
}) {
  return {
    params: { companySlug: 'acme-research' },
    deps,
  };
}

beforeEach(() => {
  getCompanyJobsPage.mockReset();
  getCompanyJobsPage.mockResolvedValue({
    company: publicCompanyFixture('acme-research'),
    page: {
      object: 'list',
      url: '/v1/jobs',
      data: [],
      hasMore: false,
      nextCursor: null,
      count: 0,
    },
    seo: {
      boardName: 'Example Jobs',
      language: 'en',
      origin: 'https://example.com',
    },
    hasSalaries: false,
    head: { meta: [], links: [] },
    jsonLd: [],
  });
});

describe('company jobs route — public company scoping', () => {
  it('uses the public company slug for browse results', async () => {
    await loadCompanyJobs(companyJobsLoaderContext({}));

    expect(getCompanyJobsPage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companySlug: 'acme-research',
        offset: 0,
        limit: 20,
      }),
    });
    expect(getCompanyJobsPage.mock.calls[0]?.[0].data).not.toHaveProperty(
      'companyId',
    );
  });

  it('uses the public company slug for keyword results', async () => {
    await loadCompanyJobs(
      companyJobsLoaderContext({ q: 'robotics', location: 'sydney', page: 2 }),
    );

    expect(getCompanyJobsPage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companySlug: 'acme-research',
        q: 'robotics',
        location: 'sydney',
        offset: 20,
        limit: 20,
      }),
    });
    expect(getCompanyJobsPage.mock.calls[0]?.[0].data).not.toHaveProperty(
      'companyId',
    );
  });
});
