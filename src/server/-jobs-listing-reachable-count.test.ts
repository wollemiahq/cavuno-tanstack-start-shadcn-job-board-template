import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  list: vi.fn(),
  search: vi.fn(),
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
vi.mock('../lib/board-context-cache', async () => {
  const { baseLocale } = await import('../paraglide/runtime');
  return {
    readBoardContext: async () => ({ name: 'Fixture', language: baseLocale }),
  };
});
vi.mock('../lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://fixture.example',
}));
vi.mock('../lib/data-source.server', () => ({
  getDataSource: () => 'board',
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
    jobs: { list: mocks.list, search: mocks.search },
  }),
}));

import { baseLocale } from '../paraglide/runtime';
import { getJobsCategoryPage, getJobsIndexPage } from './jobs-listing-pages';

/** A keyword search matching more jobs than its deepest page reaches. */
function cappedSearch(offset: number) {
  return {
    object: 'search_result',
    url: '/v1/jobs/search',
    data: [],
    hasMore: offset + 20 < 1000,
    nextCursor: null,
    count: 4935,
    reachableCount: 1000,
  };
}

const fullCount = new Intl.NumberFormat(baseLocale).format(4935);

function title(head: { meta: object[] }): string {
  const entry = head.meta.find(
    (meta): meta is { title: string } => 'title' in meta,
  );
  return entry?.title ?? '';
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockImplementation(async (body: { offset: number }) =>
    cappedSearch(body.offset),
  );
  mocks.list.mockResolvedValue({
    object: 'list',
    url: '/v1/jobs',
    data: [],
    hasMore: true,
    nextCursor: null,
    count: 4935,
  });
});

describe('jobs listing past the reachable depth of a keyword search', () => {
  it('keeps the full match count and passes the reachable depth on', async () => {
    const page = await getJobsIndexPage({
      data: { q: 'engineer', offset: 0, limit: 20 },
    });
    expect(page.reachableCount).toBe(1000);
    expect(page.page.count).toBe(4935);
    expect(title(page.head)).toContain(fullCount);
    expect(mocks.search).toHaveBeenCalledTimes(1);
  });

  it('serves the last reachable page for a page past the depth', async () => {
    const page = await getJobsIndexPage({
      data: { q: 'engineer', offset: 1180, limit: 20 },
    });
    expect(mocks.search.mock.calls.map((call) => call[0]?.offset)).toEqual([
      1180, 980,
    ]);
    expect(page.reachableCount).toBe(1000);
  });

  it('leaves a listing without a reachable depth alone', async () => {
    mocks.resolve.mockResolvedValue({
      object: 'taxonomy_resolution',
      type: 'category',
      sourceSlug: 'fixture-category',
      canonicalSlug: 'fixture-category',
      displayName: 'Fixture Category',
      redirectTo: null,
      geo: null,
    });
    const page = await getJobsCategoryPage({
      data: { categorySlug: 'fixture-category', offset: 1180, limit: 20 },
    });
    expect(page.kind === 'ok' && page.reachableCount).toBeUndefined();
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });
});
