import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  postsList: vi.fn(),
  search: vi.fn(),
  tagsList: vi.fn(),
  tagsRetrieve: vi.fn(),
  authorsRetrieve: vi.fn(),
  jobsList: vi.fn(),
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
    readBoardContext: async () => ({
      name: 'Fixture',
      language: baseLocale,
      features: { blog: true, talentDirectory: 'off' },
    }),
  };
});
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
    blog: {
      posts: { list: mocks.postsList },
      search: mocks.search,
      tags: { list: mocks.tagsList, retrieve: mocks.tagsRetrieve },
      authors: { retrieve: mocks.authorsRetrieve },
    },
    jobs: { list: mocks.jobsList },
    taxonomy: { categories: { list: async () => ({ data: [] }) } },
    companies: { list: async () => ({ data: [], count: 0 }) },
  }),
}));

import { BLOG_PAGE_SIZE } from '../lib/blog';
import {
  getBlogAuthorPage,
  getBlogIndexPage,
  getBlogTagPage,
} from './blog-pages';
import { getHomePage } from './home-page';

const post = (id: string, featured = false) => ({ id, featured });

function envelope(
  data: ReturnType<typeof post>[],
  extra: Partial<{ hasMore: boolean; nextCursor: string | null }> = {},
) {
  return {
    object: 'list',
    url: '/v1/blog/posts',
    data,
    count: 40,
    hasMore: true,
    nextCursor: 'next-page',
    ...extra,
  };
}

const ids = (posts: { id: string }[] | null) => posts?.map((p) => p.id);

/** A Board API error as the SDK raises it. */
function apiError(code: string) {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tagsList.mockResolvedValue({ data: [] });
  mocks.tagsRetrieve.mockResolvedValue({
    slug: 'hiring',
    name: 'Hiring',
    description: null,
  });
  mocks.authorsRetrieve.mockResolvedValue({
    slug: 'priya',
    name: 'Priya',
    bio: null,
  });
  mocks.jobsList.mockResolvedValue({
    object: 'list',
    url: '/v1/jobs',
    data: [],
    count: 0,
    hasMore: false,
    nextCursor: null,
    relatedSearches: [],
  });
});

describe('blog archives list featured posts first (sort=featured)', () => {
  it('reads every /blog page in one sorted request and keeps its cursor', async () => {
    mocks.postsList.mockResolvedValue(
      envelope([post('f1', true), post('c1'), post('c2')]),
    );

    const first = await getBlogIndexPage({ data: {} });
    expect(mocks.postsList).toHaveBeenCalledTimes(1);
    expect(mocks.postsList).toHaveBeenCalledWith(
      { cursor: undefined, limit: BLOG_PAGE_SIZE, sort: 'featured' },
      { headers: {} },
    );
    expect(ids(first.page.data)).toEqual(['f1', 'c1', 'c2']);
    expect(first.page.nextCursor).toBe('next-page');

    await getBlogIndexPage({ data: { cursor: 'next-page' } });
    expect(mocks.postsList).toHaveBeenLastCalledWith(
      { cursor: 'next-page', limit: BLOG_PAGE_SIZE, sort: 'featured' },
      { headers: {} },
    );
  });

  it('leaves search results in their own order', async () => {
    mocks.search.mockResolvedValue(envelope([post('c2'), post('f1', true)]));

    const result = await getBlogIndexPage({ data: { q: 'design' } });

    expect(ids(result.page.data)).toEqual(['c2', 'f1']);
    expect(mocks.postsList).not.toHaveBeenCalled();
  });

  it('scopes tag and author pages to their listing', async () => {
    mocks.postsList.mockResolvedValue(envelope([post('f1', true)]));

    await getBlogTagPage({ data: { tagSlug: 'hiring' } });
    expect(mocks.postsList).toHaveBeenLastCalledWith(
      {
        tagSlug: 'hiring',
        cursor: undefined,
        limit: BLOG_PAGE_SIZE,
        sort: 'featured',
      },
      { headers: {} },
    );

    await getBlogAuthorPage({ data: { authorSlug: 'priya', cursor: 'c' } });
    expect(mocks.postsList).toHaveBeenLastCalledWith(
      {
        authorSlug: 'priya',
        cursor: 'c',
        limit: BLOG_PAGE_SIZE,
        sort: 'featured',
      },
      { headers: {} },
    );
  });

  it('serves page one for a cursor minted by another list (an old Next link)', async () => {
    mocks.postsList.mockImplementation(async (query: { cursor?: string }) => {
      if (query.cursor) throw apiError('pagination_invalid_cursor');
      return envelope([post('f1', true), post('c1')]);
    });

    const result = await getBlogIndexPage({ data: { cursor: 'stale' } });

    expect(ids(result.page.data)).toEqual(['f1', 'c1']);
    expect(mocks.postsList).toHaveBeenLastCalledWith(
      { cursor: undefined, limit: BLOG_PAGE_SIZE, sort: 'featured' },
      { headers: {} },
    );
  });
});

describe('the stale-cursor fallback only covers stale cursors', () => {
  it('lets any other error on a later page through, without a retry', async () => {
    mocks.postsList.mockRejectedValue(apiError('rate_limited'));

    await expect(
      getBlogIndexPage({ data: { cursor: 'next-page' } }),
    ).rejects.toMatchObject({ code: 'rate_limited' });
    expect(mocks.postsList).toHaveBeenCalledTimes(1);
  });

  it('does not retry an invalid-cursor error on page one', async () => {
    mocks.postsList.mockRejectedValue(apiError('pagination_invalid_cursor'));

    await expect(getBlogIndexPage({ data: {} })).rejects.toMatchObject({
      code: 'pagination_invalid_cursor',
    });
    expect(mocks.postsList).toHaveBeenCalledTimes(1);
  });
});

describe('homepage blog strip: featured first, three posts', () => {
  it('reads one sorted request of three posts', async () => {
    mocks.postsList.mockResolvedValue(
      envelope([post('f1', true), post('c1'), post('c2')]),
    );

    const result = await getHomePage();

    expect(mocks.postsList).toHaveBeenCalledTimes(1);
    expect(mocks.postsList).toHaveBeenCalledWith(
      { limit: 3, sort: 'featured' },
      { headers: {} },
    );
    expect(ids(result.posts)).toEqual(['f1', 'c1', 'c2']);
    expect(result.postsCount).toBe(40);
  });
});
