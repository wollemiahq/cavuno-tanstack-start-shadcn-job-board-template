import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSalaryTitlesIndexPage } = vi.hoisted(() => ({
  getSalaryTitlesIndexPage: vi.fn(),
}));

vi.mock('../server/salary-pages', () => ({
  getSalaryTitlesIndexPage,
}));

import { Route as SalaryTitlesRoute } from './salaries.titles.index';

function validateSearch(search: Record<string, unknown>) {
  const validate = SalaryTitlesRoute.options.validateSearch;
  if (typeof validate !== 'function') {
    throw new Error('The salary titles route does not validate search');
  }
  return validate(search);
}

function loader() {
  const load = SalaryTitlesRoute.options.loader;
  if (typeof load !== 'function') {
    throw new Error('The salary titles route does not define a loader');
  }
  return load;
}

beforeEach(() => {
  getSalaryTitlesIndexPage.mockReset();
  getSalaryTitlesIndexPage.mockResolvedValue({
    titles: [],
    count: 218,
    page: 1,
    pageSize: 50,
    head: {},
    jsonLd: [],
  });
});

describe('salary titles pagination contract', () => {
  it('normalizes page one to a clean URL and preserves later pages', () => {
    expect(validateSearch({})).toEqual({ page: undefined });
    expect(validateSearch({ page: 1 })).toEqual({ page: undefined });
    expect(validateSearch({ page: '3' })).toEqual({ page: 3 });
  });

  it('requests the same bounded directory page size as skills', async () => {
    await loader()({ deps: { page: 3 } } as never);

    expect(getSalaryTitlesIndexPage).toHaveBeenCalledWith({
      data: { page: 3, pageSize: 50 },
    });
  });
});
