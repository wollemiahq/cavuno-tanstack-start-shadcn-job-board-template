import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  adjacent: vi.fn(),
  list: vi.fn(),
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
    blog: {
      posts: {
        retrieve: mocks.retrieve,
        adjacent: mocks.adjacent,
        list: mocks.list,
      },
    },
  }),
}));
import { getBlogPostPage } from './blog-pages';

const POST = {
  id: 'post_1',
  slug: 'fixture-post',
  title: 'Fixture post',
  seoTitle: null,
  seoDescription: null,
  customExcerpt: 'Fixture excerpt',
  canonicalUrl: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  coverUrl: null,
  ogImageUrl: null,
  featureImageAlt: null,
  authors: [],
  tags: [{ slug: 'fixture-tag', name: 'Fixture tag' }],
};

const NEIGHBOURS = {
  previous: { slug: 'older', title: 'Older' },
  next: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.adjacent.mockResolvedValue(NEIGHBOURS);
  mocks.list.mockResolvedValue({ data: [] });
});

describe('blog post reads', () => {
  it('reads the neighbours and latest posts while the post is still loading', async () => {
    let settlePost: (post: typeof POST) => void = () => undefined;
    mocks.retrieve.mockReturnValue(
      new Promise((resolve) => {
        settlePost = resolve;
      }),
    );

    const rendering = getBlogPostPage({ data: { postSlug: 'fixture-post' } });
    await Promise.resolve();

    expect(mocks.adjacent).toHaveBeenCalledWith(
      'fixture-post',
      expect.anything(),
    );
    expect(mocks.list).toHaveBeenCalledWith({ limit: 4 }, expect.anything());
    // The by-tag list needs the post's first tag, so it waits for it.
    expect(mocks.list).toHaveBeenCalledTimes(1);

    settlePost(POST);
    const page = await rendering;
    expect(mocks.list).toHaveBeenCalledWith(
      { tagSlug: 'fixture-tag', limit: 4 },
      expect.anything(),
    );
    expect(page.adjacent).toEqual(NEIGHBOURS);
  });

  it('does not fail an aliased slug on its neighbours, which the 308 discards', async () => {
    mocks.retrieve.mockResolvedValue({ ...POST, slug: 'new-slug' });
    mocks.adjacent.mockRejectedValue(new Error('upstream 500'));

    const page = await getBlogPostPage({ data: { postSlug: 'old-slug' } });

    expect(page.post.slug).toBe('new-slug');
    expect(page.adjacent).toMatchObject({ previous: null, next: null });
  });
});

describe('blog post reads when the post read fails', () => {
  it('surfaces the post error even when the early reads fail too', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    mocks.retrieve.mockRejectedValue(new Error('post read failed'));
    mocks.adjacent.mockRejectedValue(new Error('adjacent failed'));
    mocks.list.mockRejectedValue(new Error('list failed'));

    await expect(
      getBlogPostPage({ data: { postSlug: 'fixture-post' } }),
    ).rejects.toThrow('post read failed');
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
