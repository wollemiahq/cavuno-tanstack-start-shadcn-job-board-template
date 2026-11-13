import { isNotFound, redirect } from '@tanstack/react-router';

import { loadIfBlogEnabled } from './-blog-enabled';
import { followManagedRedirect, requestedPath } from './-catch-all-loader';

import type { getBlogPostPage } from '../server/blog-pages';
import type { resolveRedirect } from '../server/queries';

export interface BlogPostLoaderDependencies {
  getBoardContext: () => Promise<{ features: { blog?: boolean } }>;
  getBlogPostPage: typeof getBlogPostPage;
  resolveRedirect: typeof resolveRedirect;
}

/**
 * The blog post loader, in the hosted platform's order: a published post
 * renders, a retired or aliased slug 308s to the post's current slug, and a
 * miss asks the board's managed redirects for the URL the visitor requested
 * (an operator pointing a retired post at its replacement) before it 404s.
 */
export function createBlogPostLoader(deps: BlogPostLoaderDependencies) {
  return async ({
    params,
    location,
  }: {
    params: { postSlug: string };
    location: { publicHref: string };
  }) => {
    let page: Awaited<ReturnType<typeof getBlogPostPage>>;
    try {
      page = await loadIfBlogEnabled(
        async () => (await deps.getBoardContext()).features.blog === true,
        () => deps.getBlogPostPage({ data: { postSlug: params.postSlug } }),
      );
    } catch (error) {
      if (!isNotFound(error)) throw error;
      return followManagedRedirect(
        deps.resolveRedirect,
        requestedPath(location),
      );
    }
    const { post } = page;
    const target =
      (post.redirected ? post.newSlug : null) ??
      (post.slug !== params.postSlug ? post.slug : null);
    if (target && target !== params.postSlug) {
      throw redirect({
        to: '/blog/$postSlug',
        params: { postSlug: target },
        statusCode: 308,
      });
    }
    return page;
  };
}
