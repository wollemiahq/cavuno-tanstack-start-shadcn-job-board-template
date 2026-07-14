import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import {
  createBlogArticleJsonLd,
  createBreadcrumbJsonLd,
} from '@cavuno/board/seo';
import {
  createFileRoute,
  getRouteApi,
  notFound,
  redirect,
} from '@tanstack/react-router';

import { BlogArchivePage } from '@/components/board/blog-archive-page';
import { BlogArticleContent } from '@/components/board/blog-article-content';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { JsonLd } from '@/components/json-ld';
import { selectRelatedPosts } from '@/lib/related-posts';
import { m } from '@/paraglide/messages';
import {
  getBlogPost,
  getBlogPostAdjacent,
  getSeoBase,
  listBlogPosts,
} from '@/server/queries';

const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/blog/$postSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  loader: async ({ params }) => {
    let post;
    try {
      post = await getBlogPost({ data: { postSlug: params.postSlug } });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }

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

    const firstTagSlug = post.tags[0]?.slug ?? null;
    const [adjacent, byTag, latest, seo] = await Promise.all([
      getBlogPostAdjacent({ data: { postSlug: post.slug } }),
      firstTagSlug
        ? listBlogPosts({ data: { tagSlug: firstTagSlug, limit: 4 } })
        : Promise.resolve(null),
      listBlogPosts({ data: { limit: 4 } }),
      getSeoBase(),
    ]);

    const related = selectRelatedPosts({
      currentId: post.id,
      byTag: byTag?.data ?? [],
      latest: latest.data,
      limit: 3,
    });

    return { post, adjacent, related, seo };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { post, seo } = loaderData;
    const ogImage = post.ogImageUrl ?? `${seo.origin}/blog/${post.slug}/og`;

    return {
      meta: [
        { title: post.seoTitle ?? post.title },
        ...((post.seoDescription ?? post.customExcerpt)
          ? [
              {
                name: 'description',
                content: (post.seoDescription ?? post.customExcerpt)!,
              },
            ]
          : []),
        { property: 'og:image', content: ogImage },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: ogImage },
      ],
      links: [
        {
          rel: 'canonical',
          href: post.canonicalUrl ?? `${seo.origin}/blog/${post.slug}`,
        },
      ],
    };
  },
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
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;
  const jsonLd = [
    createBlogArticleJsonLd({
      post,
      boardName: seo.boardName,
      permalink,
      ogImageUrl: post.ogImageUrl ?? `${seo.origin}/blog/${post.slug}/og`,
    }),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.blog, href: `${seo.origin}/blog` },
      { label: post.title },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);

  return (
    <>
      <JsonLd data={jsonLd} />
      <BlogArticleContent
        breadcrumb={{
          ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
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
