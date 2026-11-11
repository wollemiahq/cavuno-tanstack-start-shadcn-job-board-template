import { BoardApiError } from '@cavuno/board';
import { isNotFound } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCompanyJobsLoader } from './-company-jobs-loader';
import { publicCompanyFixture } from './-route-test-fixtures';

import type { getCompanyJobsPage as GetCompanyJobsPage } from '../server/companies-pages';
import type { resolveRedirect as ResolveRedirect } from '../server/queries';

const getCompanyJobsPage = vi.fn<typeof GetCompanyJobsPage>();
const resolveRedirect = vi.fn<typeof ResolveRedirect>();
const loadCompanyJobs = createCompanyJobsLoader(
  getCompanyJobsPage,
  resolveRedirect,
);

function companyJobsLoaderContext(deps: {
  q?: string;
  location?: string;
  page?: number;
}) {
  return {
    params: { companySlug: 'acme-research' },
    deps,
    location: { publicHref: '/companies/acme-research/jobs' },
  };
}

beforeEach(() => {
  resolveRedirect.mockReset();
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
    reachableCount: undefined,
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

describe('company jobs route — a missing company', () => {
  const missing = new BoardApiError({
    status: 404,
    code: 'not_found',
    message: 'Not found',
    raw: undefined,
  });

  it('308s to the managed redirect for the localized URL', async () => {
    getCompanyJobsPage.mockRejectedValue(missing);
    resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/bedrijven/oud-bedrijf/vacatures',
      target: '/bedrijven/nieuw-bedrijf/vacatures',
    });

    const result = loadCompanyJobs({
      params: { companySlug: 'oud-bedrijf' },
      deps: {},
      location: { publicHref: '/bedrijven/oud-bedrijf/vacatures?page=2' },
    });

    await expect(result).rejects.toMatchObject({
      options: { href: '/bedrijven/nieuw-bedrijf/vacatures', statusCode: 308 },
    });
    expect(resolveRedirect).toHaveBeenCalledWith({
      data: { path: '/bedrijven/oud-bedrijf/vacatures' },
    });
  });

  it('404s when no managed redirect matches', async () => {
    getCompanyJobsPage.mockRejectedValue(missing);
    resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/companies/acme-research/jobs',
      target: null,
    });

    await expect(
      loadCompanyJobs(companyJobsLoaderContext({})),
    ).rejects.toSatisfy(isNotFound);
  });

  it('does not look up a managed redirect for a page that renders', async () => {
    await loadCompanyJobs(companyJobsLoaderContext({}));

    expect(resolveRedirect).not.toHaveBeenCalled();
  });
});
