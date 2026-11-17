import { describe, expect, it, vi } from 'vitest';

const summary = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-start', async (original) => ({
  ...(await original<typeof import('@tanstack/react-start')>()),
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      middleware: () => chain,
      handler:
        <TData, TResult>(
          handler: (input: {
            data: TData;
            context: Record<string, never>;
          }) => TResult,
        ) =>
        (input: { data: TData }) =>
          handler({ ...input, context: {} }),
    };
    return chain;
  },
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('./board-access', () => ({
  gatedRead: <TResult>(
    _context: Record<string, never>,
    read: (headers: Record<string, string>) => TResult,
  ) => read({}),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({ companies: { salaries: { summary } } }),
}));

import { getCompanySalarySummary } from './queries';

describe('company salary summary', () => {
  it('keeps a category the API marks not indexable, with its flag', async () => {
    // The selected-company pane shows a category headline as text, and decides
    // whether the company has salaries, from these rows; only links filter.
    summary.mockResolvedValue({
      overallSalary: null,
      topCategories: [
        {
          categorySlug: 'fixture',
          categoryName: 'Fixture',
          avgSalaryMin: 1,
          avgSalaryMax: 2,
          jobCount: 3,
          indexable: false,
        },
      ],
      currency: 'USD',
    });
    const result = await getCompanySalarySummary({
      data: { companySlug: 'fixture-company' },
    });
    expect(result.byCategory).toEqual([
      expect.objectContaining({ categorySlug: 'fixture', indexable: false }),
    ]);
  });
});
