import { BoardApiError } from '@cavuno/board';
import { blogPostPath, blogTagPath } from '@cavuno/board/paths';
import { notFound } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '../../lib/localized-path';
import { resolveMarkdownTwin } from '../../lib/markdown-twin/routes';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import {
  buildBlogPostTwin,
  buildBlogTagTwin,
  buildBlogTwin,
  type BlogTwinDependencies,
} from './blog';
import { escapeInline } from './format';

import type { PublicBlogPost, PublicBlogPostSummary } from '@cavuno/board';

const ORIGIN = 'https://board.example';
const CANONICAL = 'https://hosted.example/blog';

const dependencies = {
  getBlogIndexPage: vi.fn<BlogTwinDependencies['getBlogIndexPage']>(),
  getBlogPostPage: vi.fn<BlogTwinDependencies['getBlogPostPage']>(),
  getBlogTagPage: vi.fn<BlogTwinDependencies['getBlogTagPage']>(),
  getBoardContext: vi.fn<BlogTwinDependencies['getBoardContext']>(),
  resolveRedirect: vi.fn<BlogTwinDependencies['resolveRedirect']>(),
};

const shared = {
  seo: { origin: ORIGIN },
  head: { links: [{ rel: 'canonical', href: CANONICAL }] },
};
const summary: PublicBlogPostSummary = {
  id: 'post_1',
  object: 'public_blog_post',
  title: 'Hello [world]',
  slug: 'hello',
  featured: false,
  coverUrl: null,
  featureImageAlt: null,
  customExcerpt: 'A first post.',
  readingTimeMin: 3,
  publishedAt: null,
  canonicalUrl: null,
  createdAt: '2026-06-10T00:00:00.000Z',
  authors: [],
  tags: [{ id: 'tag_1', name: 'Remote', slug: 'remote', description: null }],
};
const post: PublicBlogPost = {
  ...summary,
  featureImageCaption: null,
  html: '<h2>Why</h2><p>Because <em>reasons</em>.</p>',
  ogImageUrl: null,
  seoTitle: null,
  seoDescription: null,
  redirected: false,
  newSlug: null,
};
const tags = [{ name: 'Remote', slug: 'remote' }];

function twinFor(path: string) {
  const twin = resolveMarkdownTwin({ method: 'GET', url: `${ORIGIN}${path}` });
  if (!twin) throw new Error(`no twin for ${path}`);
  return twin;
}

async function markdown(result: Promise<{ type: string; body?: string }>) {
  const resolved = await result;
  if (resolved.type !== 'markdown' || !resolved.body) {
    throw new Error(`expected markdown, got ${resolved.type}`);
  }
  return resolved.body;
}

const blogPath = localizePath('/blog');
const postPath = localizePath(blogPostPath('hello'));

beforeEach(() => {
  for (const mock of Object.values(dependencies)) mock.mockReset();
  dependencies.getBoardContext.mockResolvedValue({ features: { blog: true } });
  dependencies.resolveRedirect.mockResolvedValue({ target: null });
});

describe('blog twins', () => {
  it('lists the archive with its posts, next page and topics', async () => {
    dependencies.getBlogIndexPage.mockResolvedValue({
      ...shared,
      page: { data: [summary], hasMore: true, nextCursor: 'c2' },
      tags,
    });
    const result = await buildBlogTwin(
      twinFor(`${blogPath}.md?q=remote`),
      ORIGIN,
      dependencies,
    );

    expect(dependencies.getBlogIndexPage).toHaveBeenCalledWith({
      data: { cursor: undefined, q: 'remote' },
    });
    expect(result).toMatchObject({ type: 'markdown', canonical: CANONICAL });
    const body = await markdown(Promise.resolve(result));
    expect(body.startsWith(`# ${m.blogIndex_title()}\n`)).toBe(true);
    const url = selfUrl(ORIGIN, blogPostPath('hello'));
    expect(body).toContain(
      `- [${escapeInline('Hello [world]')}](${url}) · Remote\n  A first post.`,
    );
    expect(body).toContain(
      `[${m.pagination_nextPageLabel()}](${ORIGIN}${blogPath}.md?q=remote&cursor=c2)`,
    );
    expect(body).toContain(
      `## ${m.blogIndex_topicsLabel()}\n\n- [Remote](${selfUrl(ORIGIN, blogTagPath('remote'))})`,
    );
  });

  it('404s every blog twin when the blog is off, as the pages do', async () => {
    dependencies.getBoardContext.mockResolvedValue({
      features: { blog: false },
    });
    dependencies.getBlogIndexPage.mockRejectedValue(
      new BoardApiError({
        status: 403,
        code: 'blog_disabled',
        message: 'Blog disabled',
        raw: undefined,
      }),
    );
    dependencies.getBlogTagPage.mockRejectedValue(notFound());
    dependencies.getBlogPostPage.mockRejectedValue(notFound());

    const tagPath = localizePath(blogTagPath('remote'));
    for (const [build, path] of [
      [buildBlogTwin, blogPath],
      [buildBlogTagTwin, tagPath],
      [buildBlogPostTwin, postPath],
    ] as const) {
      await expect(
        build(twinFor(`${path}.md`), ORIGIN, dependencies),
      ).resolves.toEqual({ type: 'notFound' });
    }
    // A missing post still asks for a configured redirect first.
    expect(dependencies.resolveRedirect).toHaveBeenCalledWith({
      data: { path: postPath },
    });
  });

  it('reads a post: body as Markdown, topics and related posts', async () => {
    dependencies.getBlogPostPage.mockResolvedValue({
      ...shared,
      post,
      adjacent: { object: 'blog_adjacent_posts', previous: null, next: null },
      related: [{ ...summary, id: 'post_2', slug: 'next', title: 'Next' }],
    });
    const body = await markdown(
      buildBlogPostTwin(twinFor(`${postPath}.md`), ORIGIN, dependencies),
    );

    expect(body.startsWith(`# ${escapeInline('Hello [world]')}\n`)).toBe(true);
    expect(body).toContain('## Why\n\nBecause _reasons_.');
    expect(body).toContain(`## ${m.blogIndex_topicsLabel()}\n\n- [Remote](`);
    expect(body).not.toContain(m.blogPost_adjacentPostsLabel());
    expect(body).toContain(
      `## ${m.blogPost_relatedPostsHeading()}\n\n- [Next](${selfUrl(ORIGIN, blogPostPath('next'))})`,
    );
  });

  it("moves a retired slug to the post's current twin, query kept", async () => {
    dependencies.getBlogPostPage.mockResolvedValue({
      ...shared,
      post: { ...post, slug: 'hello-again' },
      adjacent: { object: 'blog_adjacent_posts', previous: null, next: null },
      related: [],
    });
    await expect(
      buildBlogPostTwin(twinFor(`${postPath}.md?ref=x`), ORIGIN, dependencies),
    ).resolves.toEqual({
      type: 'redirect',
      location: `${localizePath(blogPostPath('hello-again'))}.md?ref=x`,
    });
  });
});
