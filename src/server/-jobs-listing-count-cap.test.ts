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

import { m } from '../paraglide/messages';
import { baseLocale } from '../paraglide/runtime';
import { getJobsCategoryPage, getJobsIndexPage } from './jobs-listing-pages';

/** A Board API list holding the ranking limit's worth of matches. */
const limitList = {
  object: 'list',
  url: '/v1/jobs',
  data: [],
  hasMore: true,
  nextCursor: null,
  count: 1000,
};

const cappedLabel = m.jobSearch_cappedCountLabel({
  count: new Intl.NumberFormat(baseLocale).format(1000),
});

function title(head: { meta: object[] }): string {
  const entry = head.meta.find(
    (meta): meta is { title: string } => 'title' in meta,
  );
  return entry?.title ?? '';
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue(limitList);
  mocks.search.mockResolvedValue({ ...limitList, object: 'search_result' });
});

describe('jobs listing count at the ranking limit', () => {
  it('caps a relevance-ordered keyword search that reaches the limit', async () => {
    const page = await getJobsIndexPage({
      data: { q: 'engineer', offset: 0, limit: 20 },
    });
    expect(page.countCapped).toBe(true);
    expect(title(page.head)).toContain(cappedLabel);
  });

  it('keeps an exact count for a browse that holds exactly the limit', async () => {
    const page = await getJobsIndexPage({ data: { offset: 0, limit: 20 } });
    expect(page.countCapped).toBe(false);
    expect(title(page.head)).not.toContain(cappedLabel);
  });

  it('keeps an exact count for a keyword search with an explicit sort', async () => {
    const page = await getJobsIndexPage({
      data: { q: 'engineer', sort: 'newest', offset: 0, limit: 20 },
    });
    expect(page.countCapped).toBe(false);
  });

  it('caps a category listing, which the API ranks as a text query', async () => {
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
      data: { categorySlug: 'fixture-category', offset: 0, limit: 20 },
    });
    expect(page.kind === 'ok' && page.countCapped).toBe(true);
  });
});
