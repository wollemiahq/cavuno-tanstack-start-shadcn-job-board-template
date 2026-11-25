import { BoardApiError } from '@cavuno/board';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicHelpArticleSummary } from '@cavuno/board';

const mocks = vi.hoisted(() => ({
  categories: vi.fn(),
  list: vi.fn(),
  retrieve: vi.fn(),
  similar: vi.fn(),
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
vi.mock('../lib/board-context-cache', () => ({
  readBoardContext: async () => ({ name: 'Fixture', language: 'en' }),
}));
vi.mock('../lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://fixture.example',
}));
vi.mock('./board-access', () => ({
  gatedRead: <TResult>(
    _context: Record<string, never>,
    read: (headers: Headers) => TResult,
  ) => read(new Headers()),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    help: {
      categories: { list: mocks.categories },
      articles: {
        list: mocks.list,
        retrieve: mocks.retrieve,
        similar: mocks.similar,
      },
      search: mocks.search,
    },
  }),
}));
import { getHelpArticlePage, getHelpHomePage } from './help-pages';

const category = { id: 'cat-billing', slug: 'billing', title: 'Billing' };

function summary(slug: string, title: string): PublicHelpArticleSummary {
  return {
    id: slug,
    object: 'public_help_article',
    slug,
    title,
    summary: null,
    category,
    publishedAt: '2026-06-12T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
  };
}

const page = (data: PublicHelpArticleSummary[]) => ({
  data,
  hasMore: false,
  nextCursor: null,
});

const apiError = (status: number, code: string) =>
  new BoardApiError({ status, code, message: code, raw: null });

const refunds = summary('refunds', 'How refunds work');
const invoices = summary('invoices', 'Where to find an invoice');
const payouts = summary('payouts', 'When payouts arrive');

beforeEach(() => {
  vi.resetAllMocks();
  mocks.categories.mockResolvedValue({ data: [category], hasMore: false });
  mocks.retrieve.mockResolvedValue({
    ...refunds,
    html: '<p>We refund within 48 hours.</p>',
    redirected: false,
    newSlug: null,
  });
});

describe('help search', () => {
  it("shows the board's search results in the order it ranked them", async () => {
    mocks.search.mockResolvedValue(page([payouts, refunds]));

    const { search, groups } = await getHelpHomePage({
      data: { q: 'money back' },
    });

    expect(mocks.search.mock.calls[0]![0]).toMatchObject({ q: 'money back' });
    expect(search).toEqual({
      query: 'money back',
      results: [payouts, refunds],
    });
    expect(groups).toEqual([]);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('keeps search results out of search engines and the help home in', async () => {
    mocks.search.mockResolvedValue(page([refunds]));
    mocks.list.mockResolvedValue(page([refunds]));
    const robots = { name: 'robots', content: 'noindex, follow' };

    const results = await getHelpHomePage({ data: { q: 'refunds' } });
    const home = await getHelpHomePage({ data: {} });

    expect(results.head.meta).toContainEqual(robots);
    expect(results.head.links).toEqual(home.head.links);
    expect(home.head.meta).not.toContainEqual(robots);
  });

  it('matches titles and summaries itself while the search index cannot answer', async () => {
    mocks.search.mockRejectedValue(apiError(503, 'search_unavailable'));
    mocks.list.mockResolvedValue(page([payouts, refunds, invoices]));

    const { search } = await getHelpHomePage({ data: { q: 'refunds' } });

    expect(search).toEqual({ query: 'refunds', results: [refunds] });
  });

  it('does not hide another failure of the search behind the fallback', async () => {
    mocks.search.mockRejectedValue(apiError(429, 'rate_limited'));
    mocks.list.mockResolvedValue(page([refunds]));

    await expect(
      getHelpHomePage({ data: { q: 'refunds' } }),
    ).rejects.toMatchObject({ code: 'rate_limited' });
  });
});

describe('articles after a help article', () => {
  it('lists the related articles and skips the category list', async () => {
    mocks.similar.mockResolvedValue(page([payouts, invoices]));

    const { related, moreInCategory } = await getHelpArticlePage({
      data: { helpArticleSlug: 'refunds' },
    });

    expect(mocks.similar.mock.calls[0]![1]).toEqual({ limit: 3 });
    expect(related).toEqual([payouts, invoices]);
    expect(moreInCategory.articles).toEqual([]);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it.each([
    ['there are none yet', () => mocks.similar.mockResolvedValue(page([]))],
    [
      'the related read fails',
      () =>
        mocks.similar.mockRejectedValue(apiError(503, 'search_unavailable')),
    ],
  ])("lists the category's other articles when %s", async (_name, arrange) => {
    arrange();
    mocks.list.mockResolvedValue(page([refunds, invoices]));

    const { related, moreInCategory } = await getHelpArticlePage({
      data: { helpArticleSlug: 'refunds' },
    });

    expect(related).toEqual([]);
    expect(moreInCategory.articles).toEqual([invoices]);
  });
});
