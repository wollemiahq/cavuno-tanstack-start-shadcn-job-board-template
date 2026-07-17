import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';

import { BlogArchivePage } from '@/components/board/blog-archive-page';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { JsonLd } from '@/components/json-ld';
import { headTitle } from '@/lib/page-title';
import { m } from '@/paraglide/messages';
import { getBlogTag, getSeoBase, listBlogPosts } from '@/server/queries';

interface BlogTagSearch {
  cursor?: string;
}

export const Route = createFileRoute('/blog/tag/$tagSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  validateSearch: (search: Record<string, unknown>): BlogTagSearch => ({
    cursor:
      typeof search.cursor === 'string' && search.cursor
        ? search.cursor
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    try {
      const [tag, posts, seo] = await Promise.all([
        getBlogTag({ data: { tagSlug: params.tagSlug } }),
        listBlogPosts({
          data: { tagSlug: params.tagSlug, cursor: deps.cursor, limit: 24 },
        }),
        getSeoBase(),
      ]);
      return { tag, posts, seo };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              // `Tag | Blog | Board` — the section segment reuses the
              // breadcrumb's key, so renaming the section moves both.
              title: headTitle(
                loaderData?.seo.boardName,
                loaderData.tag.name,
                m.blogIndex_title(),
              ),
            },
            {
              name: 'description',
              content:
                loaderData.tag.description ??
                m.blogTag_metaDescription({
                  tag: loaderData.tag.name,
                  boardName: loaderData.seo.boardName,
                }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: `${loaderData.seo.origin}/blog/tag/${loaderData.tag.slug}`,
            },
          ],
        }
      : {},
  component: TagPage,
  notFoundComponent: BlogTagNotFound,
});

function BlogTagNotFound() {
  return (
    <BlogArchivePage
      breadcrumb={{
        ariaLabel: m.blogIndex_breadcrumbLabel(),
        items: [
          { name: m.blogIndex_homeLabel(), href: '/' },
          { name: m.blogIndex_title(), href: '/blog' },
          { name: m.blogTag_notFoundText() },
        ],
      }}
      title={m.blogTag_notFoundText()}
      posts={[]}
      empty={{
        title: m.blogTag_notFoundText(),
        description: m.blogTag_notFoundDescription(),
        action: { label: m.blogPost_backToBlogLabel(), href: '/blog' },
      }}
    />
  );
}

function TagPage() {
  const { tag, posts, seo } = Route.useLoaderData();
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.blog, href: `${seo.origin}/blog` },
      { label: tag.name },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);

  return (
    <>
      <JsonLd data={jsonLd} />
      <BlogArchivePage
        breadcrumb={{
          ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
          items: [
            { name: crumbs.home, href: '/' },
            { name: crumbs.blog, href: '/blog' },
            { name: tag.name },
          ],
        }}
        title={tag.name}
        description={tag.description}
        posts={posts.data}
        empty={{
          title: m.blogIndex_emptyTitle(),
          description: m.blogTag_emptyText({ tag: tag.name }),
          action: { label: m.blogIndex_browseAllLabel(), href: '/blog' },
        }}
        nextLink={
          posts.hasMore && posts.nextCursor ? (
            <Link
              to="/blog/tag/$tagSlug"
              params={{ tagSlug: tag.slug }}
              search={{ cursor: posts.nextCursor }}
            >
              {m.blogIndex_nextResultsLabel()}
            </Link>
          ) : undefined
        }
      />
    </>
  );
}
