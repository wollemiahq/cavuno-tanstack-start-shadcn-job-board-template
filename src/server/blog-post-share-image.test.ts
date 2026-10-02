import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ retrieve: vi.fn() }));
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
        adjacent: async () => ({ previous: null, next: null }),
        list: async () => ({ data: [] }),
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
  tags: [],
};

async function shareImages(
  post: { coverUrl?: string; ogImageUrl?: string } = {},
) {
  mocks.retrieve.mockResolvedValue({ ...POST, ...post });
  const { head } = await getBlogPostPage({
    data: { postSlug: 'fixture-post' },
  });
  const content = (key: string) =>
    head.meta.find(
      (tag) =>
        ('property' in tag && tag.property === key) ||
        ('name' in tag && tag.name === key),
    )?.content;
  return { og: content('og:image'), twitter: content('twitter:image') };
}

beforeEach(() => vi.clearAllMocks());

describe('blog post share image', () => {
  it('uses the header image when the post has one', async () => {
    const cover = 'https://assets.example/cover.webp';
    expect(await shareImages({ coverUrl: cover })).toEqual({
      og: cover,
      twitter: cover,
    });
  });

  it('prefers an explicit OG image over the header image', async () => {
    const og = 'https://assets.example/og.png';
    expect(
      await shareImages({
        coverUrl: 'https://assets.example/cover.webp',
        ogImageUrl: og,
      }),
    ).toEqual({ og, twitter: og });
  });

  it('falls back to the generated card without either image', async () => {
    const card = 'https://fixture.example/blog/fixture-post/og';
    expect(await shareImages()).toEqual({ og: card, twitter: card });
  });
});
