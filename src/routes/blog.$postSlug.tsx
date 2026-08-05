import { isNotFound } from '@cavuno/board';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import { BlogArchivePage } from '@/components/board/blog-archive-page';
import { BlogArticleContent } from '@/components/board/blog-article-content';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { resolveJobDetailBreadcrumbAriaLabel } from '@/lib/breadcrumb-aria-label';
import { getBlogPostPage } from '@/server/blog-pages';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/blog/$postSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  loader: async ({ params }) => {
    let page;
    try {
      page = await getBlogPostPage({ data: { postSlug: params.postSlug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
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
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: PostPage,
  notFoundComponent: BlogPostNotFound,
});

function BlogPostNotFound() {
  return (
    <BlogArchivePage
      breadcrumb={{
        ariaLabel: m.blogIndex_breadcrumbLabel(),
        items: [
          { name: m.blogIndex_homeLabel(), href: '/' },
          { name: m.blogIndex_title(), href: '/blog' },
          { name: m.blogPost_notFoundText() },
        ],
      }}
      title={m.blogPost_notFoundText()}
      posts={[]}
      empty={{
        title: m.blogPost_notFoundText(),
        description: m.blogPost_notFoundDescription(),
        action: { label: m.blogPost_backToBlogLabel(), href: '/blog' },
      }}
    />
  );
}

function PostPage() {
  const { post, adjacent, related, seo } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const permalink = post.canonicalUrl ?? `${seo.origin}/blog/${post.slug}`;
  const crumbs = breadcrumbsCopy(seo.language);
  const ariaLabel = resolveJobDetailBreadcrumbAriaLabel();

  return (
    <>
      <BlogArticleContent
        breadcrumb={{
          ariaLabel,
          items: [
            { name: crumbs.home, href: '/' },
            { name: crumbs.blog, href: '/blog' },
            { name: post.title },
          ],
        }}
        post={post}
        language={board.language}
        permalink={permalink}
        adjacent={adjacent}
        related={related}
        missingBody={{
          title: m.blogPost_missingBodyTitle(),
          description: m.blogPost_missingBodyDescription(),
          action: {
            label: m.blogPost_backToBlogLabel(),
            href: '/blog',
          },
        }}
      />
    </>
  );
}
