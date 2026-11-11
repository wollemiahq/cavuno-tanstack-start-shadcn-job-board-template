import { isNotFound, isRedirect, notFound } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBlogPostLoader } from './-blog-post-loader';

import type { BlogPostLoaderDependencies } from './-blog-post-loader';

const deps = {
  getBoardContext: vi.fn<BlogPostLoaderDependencies['getBoardContext']>(),
  getBlogPostPage: vi.fn<BlogPostLoaderDependencies['getBlogPostPage']>(),
  resolveRedirect: vi.fn<BlogPostLoaderDependencies['resolveRedirect']>(),
};
const loadBlogPostWith = createBlogPostLoader(deps);

function loadBlogPost(publicHref = '/blog/old-post') {
  return loadBlogPostWith({
    params: { postSlug: 'old-post' },
    location: { publicHref },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  deps.getBoardContext.mockResolvedValue({ features: { blog: true } });
  deps.getBlogPostPage.mockRejectedValue(notFound());
});

describe('blog post loader — missing post', () => {
  it('308s to the managed redirect for the requested URL', async () => {
    deps.resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/blog/old-post',
      target: '/blog/new-post',
    });

    const result = loadBlogPost();

    await expect(result).rejects.toSatisfy(isRedirect);
    await expect(result).rejects.toMatchObject({
      options: { href: '/blog/new-post', statusCode: 308 },
    });
    expect(deps.resolveRedirect).toHaveBeenCalledWith({
      data: { path: '/blog/old-post' },
    });
  });

  it('still 404s when no managed redirect matches', async () => {
    deps.resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/blog/old-post',
      target: null,
    });

    await expect(loadBlogPost()).rejects.toSatisfy(isNotFound);
  });

  it('asks with the localized, locale-prefixed URL', async () => {
    deps.resolveRedirect.mockResolvedValue({
      object: 'redirect_resolution',
      path: '/fr/blog/old-post',
      target: null,
    });

    await expect(loadBlogPost('/fr/blog/old-post?ref=x')).rejects.toSatisfy(
      isNotFound,
    );
    expect(deps.resolveRedirect).toHaveBeenCalledWith({
      data: { path: '/fr/blog/old-post' },
    });
  });
});
