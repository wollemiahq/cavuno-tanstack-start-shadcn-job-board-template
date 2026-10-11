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

/** Chronological pages answer without `featured`; featured lists with it. */
function serve(
  chronological: ReturnType<typeof post>[],
  featured: ReturnType<typeof post>[],
) {
  mocks.postsList.mockImplementation(async (query: { featured?: 'true' }) =>
    query.featured === 'true' ? envelope(featured) : envelope(chronological),
  );
}

const ids = (posts: { id: string }[] | null) => posts?.map((p) => p.id);

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

describe('blog index: featured posts lead page one', () => {
  it('puts featured posts first and keeps the chronological cursor', async () => {
    serve(
      [post('c1'), post('f1', true), post('c2')],
      [post('f1', true), post('f-old', true)],
    );

    const result = await getBlogIndexPage({ data: {} });

    expect(mocks.postsList).toHaveBeenCalledWith(
      { featured: 'true', limit: BLOG_PAGE_SIZE },
      { headers: {} },
    );
    expect(ids(result.page.data)).toEqual(['f1', 'f-old', 'c1', 'c2']);
    expect(result.page.nextCursor).toBe('next-page');
    expect(result.page.hasMore).toBe(true);
    expect(result.page.count).toBe(40);
  });

  it('leaves later pages purely chronological', async () => {
    serve([post('c13'), post('f-old', true)], [post('f-old', true)]);

    const result = await getBlogIndexPage({ data: { cursor: 'next-page' } });

    expect(ids(result.page.data)).toEqual(['c13', 'f-old']);
    expect(mocks.postsList).toHaveBeenCalledTimes(1);
  });

  it('leaves search results in their own order', async () => {
    mocks.search.mockResolvedValue(envelope([post('c2'), post('f1', true)]));

    const result = await getBlogIndexPage({ data: { q: 'design' } });

    expect(ids(result.page.data)).toEqual(['c2', 'f1']);
    expect(mocks.postsList).not.toHaveBeenCalled();
  });

  it('falls back to the chronological page when the featured read fails', async () => {
    mocks.postsList.mockImplementation(async (query: { featured?: 'true' }) => {
      if (query.featured === 'true') throw new Error('unavailable');
      return envelope([post('c1'), post('c2')]);
    });

    const result = await getBlogIndexPage({ data: {} });

    expect(ids(result.page.data)).toEqual(['c1', 'c2']);
  });
});

describe('tag and author archives: featured posts lead page one', () => {
  it("leads a tag page with that tag's featured posts", async () => {
    serve(
      [post('c1'), post('f1', true)],
      [post('f1', true), post('f-old', true)],
    );

    const result = await getBlogTagPage({ data: { tagSlug: 'hiring' } });

    expect(mocks.postsList).toHaveBeenCalledWith(
      { tagSlug: 'hiring', featured: 'true', limit: BLOG_PAGE_SIZE },
      { headers: {} },
    );
    expect(ids(result.posts.data)).toEqual(['f1', 'f-old', 'c1']);
    expect(result.posts.nextCursor).toBe('next-page');
  });

  it("leads an author page with that author's featured posts", async () => {
    serve([post('c1'), post('c2')], [post('f-old', true)]);

    const result = await getBlogAuthorPage({ data: { authorSlug: 'priya' } });

    expect(mocks.postsList).toHaveBeenCalledWith(
      { authorSlug: 'priya', featured: 'true', limit: BLOG_PAGE_SIZE },
      { headers: {} },
    );
    expect(ids(result.posts.data)).toEqual(['f-old', 'c1', 'c2']);
  });

  it('leaves later tag pages purely chronological', async () => {
    serve([post('c13'), post('f-old', true)], [post('f-old', true)]);

    const result = await getBlogTagPage({
      data: { tagSlug: 'hiring', cursor: 'next-page' },
    });

    expect(ids(result.posts.data)).toEqual(['c13', 'f-old']);
    expect(mocks.postsList).toHaveBeenCalledTimes(1);
  });
});

describe('homepage blog strip: featured first, three posts', () => {
  it('shows featured posts, then the newest others, capped at three', async () => {
    serve(
      [post('c1'), post('f1', true), post('c2')],
      [post('f1', true), post('f-old', true)],
    );

    const result = await getHomePage();

    expect(ids(result.posts)).toEqual(['f1', 'f-old', 'c1']);
    // The count eyebrow still reports every post, not the strip.
    expect(result.postsCount).toBe(40);
  });
});
