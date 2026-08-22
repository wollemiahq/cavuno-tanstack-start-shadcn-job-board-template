import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSalarySkillsIndexPage } = vi.hoisted(() => ({
  getSalarySkillsIndexPage: vi.fn(),
}));

vi.mock('../server/salary-pages', () => ({
  getSalarySkillsIndexPage,
}));

import { Route as SalarySkillsRoute } from './salaries.skills.index';

function validateSearch(search: Record<string, unknown>) {
  const validate = SalarySkillsRoute.options.validateSearch;
  if (typeof validate !== 'function') {
    throw new Error('The salary skills route does not validate search');
  }
  return validate(search);
}

function loader() {
  const load = SalarySkillsRoute.options.loader;
  if (typeof load !== 'function') {
    throw new Error('The salary skills route does not define a loader');
  }
  return load;
}

beforeEach(() => {
  getSalarySkillsIndexPage.mockReset();
  getSalarySkillsIndexPage.mockResolvedValue({
    skills: [],
    count: 669,
    page: 1,
    pageSize: 50,
    head: {},
    jsonLd: [],
  });
});

describe('salary skills pagination contract', () => {
  it('normalizes page one to a clean URL and preserves later pages', () => {
    expect(validateSearch({})).toEqual({ page: undefined });
    expect(validateSearch({ page: 1 })).toEqual({ page: undefined });
    expect(validateSearch({ page: '3' })).toEqual({ page: 3 });
  });

  it('requests only the configured page from the server boundary', async () => {
    await loader()({ deps: { page: 3 } } as never);

    expect(getSalarySkillsIndexPage).toHaveBeenCalledWith({
      data: { page: 3, pageSize: 50 },
    });
  });
});
