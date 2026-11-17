import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  list: vi.fn(),
  titles: vi.fn(),
  // A fresh data source per test keeps the settled hub cache from carrying
  // one test's list into the next.
  dataSource: { current: 'board-0' },
}));
vi.mock('@tanstack/react-start', () => ({
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
vi.mock('../lib/board-context-cache', () => ({
  readBoardContext: async () => ({ name: 'Fixture', language: 'en' }),
}));
vi.mock('../lib/data-source.server', () => ({
  getDataSource: () => mocks.dataSource.current,
}));
vi.mock('../lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://fixture.example',
}));
vi.mock('./board-access', () => ({
  gatedRead: <TResult>(
    _context: Record<string, never>,
    read: (headers: Record<string, string>) => TResult,
  ) => read({}),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    taxonomy: { categories: { resolve: mocks.resolve } },
    jobs: { list: mocks.list },
    salaries: { titles: { list: mocks.titles } },
  }),
}));
import { getJobsCategoryPage } from './jobs-listing-pages';

let run = 0;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.dataSource.current = `board-${++run}`;
  mocks.resolve.mockResolvedValue({
    sourceSlug: 'fixture-role',
    canonicalSlug: 'fixture-role',
    displayName: 'Fixture role',
    redirectTo: null,
  });
  mocks.list.mockResolvedValue({ data: [], count: 0 });
});

function loadCategory() {
  return getJobsCategoryPage({
    data: { categorySlug: 'fixture-role', offset: 0, limit: 24 },
  });
}

function titleRow(slug: string, indexable: boolean) {
  return { object: 'salary_title', slug, name: slug, indexable };
}

describe('jobs category salary link verdict', () => {
  it("names the role's salary page when the titles hub marks it indexable", async () => {
    mocks.titles.mockResolvedValue({ data: [titleRow('fixture-role', true)] });
    expect(await loadCategory()).toMatchObject({
      kind: 'ok',
      salaryTitleSlug: 'fixture-role',
    });
  });

  it('links nothing when the hub marks it noindex or does not list it', async () => {
    mocks.titles.mockResolvedValue({ data: [titleRow('fixture-role', false)] });
    expect(await loadCategory()).toMatchObject({ salaryTitleSlug: null });

    mocks.dataSource.current = `board-${++run}`;
    mocks.titles.mockResolvedValue({ data: [titleRow('other-role', true)] });
    expect(await loadCategory()).toMatchObject({ salaryTitleSlug: null });
  });

  it('links nothing when the hub read fails, and keeps the page', async () => {
    mocks.titles.mockRejectedValue(new Error('hub down'));
    expect(await loadCategory()).toMatchObject({
      kind: 'ok',
      salaryTitleSlug: null,
    });
  });

  it('reads the hub once per isolate, not once per page', async () => {
    mocks.titles.mockResolvedValue({ data: [titleRow('fixture-role', true)] });
    await loadCategory();
    await loadCategory();
    expect(mocks.titles).toHaveBeenCalledTimes(1);
  });
});
