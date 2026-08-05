import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCompany, getCompanyJobsPage } = vi.hoisted(() => ({
  getCompany: vi.fn(),
  getCompanyJobsPage: vi.fn(),
}));

vi.mock('../server/queries', () => ({
  getCompany,
}));

vi.mock('../server/companies-pages', () => ({
  getCompanyJobsPage,
}));

import { Route } from './companies.$companySlug.jobs.index';

function loader() {
  const load = Route.options.loader;
  if (typeof load !== 'function') {
    throw new Error('The company jobs route does not define a callable loader');
  }
  return load;
}

beforeEach(() => {
  getCompany.mockReset();
  getCompany.mockResolvedValue({
    id: 'internal-company-id',
    slug: 'acme-research',
    name: 'Acme Research',
  });
  getCompanyJobsPage.mockReset();
  getCompanyJobsPage.mockResolvedValue({
    page: { data: [], count: 0 },
    seo: { origin: 'https://example.com' },
    hasSalaries: false,
    head: {},
    jsonLd: [],
  });
});

describe('company jobs route — public company scoping', () => {
  it('uses the public company slug for browse results', async () => {
    await loader()({
      params: { companySlug: 'acme-research' },
      deps: {},
    } as never);

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
    await loader()({
      params: { companySlug: 'acme-research' },
      deps: { q: 'robotics', location: 'sydney', page: 2 },
    } as never);

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
