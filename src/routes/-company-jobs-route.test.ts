import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCompany,
  getCompanySalaryPresence,
  getSeoBase,
  listJobs,
  searchJobs,
} = vi.hoisted(() => ({
  getCompany: vi.fn(),
  getCompanySalaryPresence: vi.fn(),
  getSeoBase: vi.fn(),
  listJobs: vi.fn(),
  searchJobs: vi.fn(),
}));

vi.mock('../server/queries', () => ({
  getCompany,
  getCompanySalaryPresence,
  getSeoBase,
  listJobs,
  searchJobs,
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
  getCompanySalaryPresence.mockReset();
  getCompanySalaryPresence.mockResolvedValue(false);
  getSeoBase.mockReset();
  getSeoBase.mockResolvedValue({});
  listJobs.mockReset();
  listJobs.mockResolvedValue({ data: [], count: 0 });
  searchJobs.mockReset();
  searchJobs.mockResolvedValue({ data: [], count: 0 });
});

describe('company jobs route — public company scoping', () => {
  it('uses the public company slug for browse results', async () => {
    await loader()({
      params: { companySlug: 'acme-research' },
      deps: {},
    } as never);

    expect(listJobs).toHaveBeenCalledWith({
      data: {
        companySlug: ['acme-research'],
        offset: 0,
        limit: 20,
      },
    });
    expect(listJobs.mock.calls[0]?.[0].data).not.toHaveProperty('companyId');
  });

  it('uses the public company slug for keyword results', async () => {
    await loader()({
      params: { companySlug: 'acme-research' },
      deps: { q: 'robotics', location: 'sydney', page: 2 },
    } as never);

    expect(searchJobs).toHaveBeenCalledWith({
      data: {
        query: 'robotics',
        filters: {
          companySlug: ['acme-research'],
          location: 'sydney',
        },
        offset: 20,
        limit: 20,
      },
    });
    expect(searchJobs.mock.calls[0]?.[0].data.filters).not.toHaveProperty(
      'companyId',
    );
  });
});
