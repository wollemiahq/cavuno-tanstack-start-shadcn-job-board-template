import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import { BOARD_PATHS, blogTagPath, boardUrl } from '@cavuno/board/paths';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import {
  createFileRoute,
  notFound,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import { BlogArchivePage } from '@/components/board/blog-archive-page';
import { BlogTagChips } from '@/components/board/blog-tag-chips';
import { CursorPagination } from '@/components/board/cursor-pagination';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { JsonLd } from '@/components/json-ld';
import { BLOG_PAGE_SIZE } from '@/lib/blog';
import { headTitle } from '@/lib/page-title';
import { cursorPageHref, cursorSearchValue } from '@/lib/pagination';
import {
  getBlogTag,
  getSeoBase,
  listBlogPosts,
  listBlogTags,
} from '@/server/queries';

interface BlogTagSearch {
  cursor?: string;
}

export const Route = createFileRoute('/blog/tag/$tagSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  validateSearch: (search: Record<string, unknown>): BlogTagSearch => ({
    cursor: cursorSearchValue(search.cursor),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    try {
      const [tag, posts, tags, seo] = await Promise.all([
        getBlogTag({ data: { tagSlug: params.tagSlug } }),
        listBlogPosts({
          data: {
            tagSlug: params.tagSlug,
            cursor: deps.cursor,
            limit: BLOG_PAGE_SIZE,
          },
        }),
        // Additive tag chips: a failing tags read must not fault the archive.
        listBlogTags({ data: {} }).catch(() => null),
        getSeoBase(),
      ]);
      return { tag, posts, tags: tags?.data ?? [], seo };
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
              href: boardUrl(
                loaderData.seo.origin,
                blogTagPath(loaderData.tag.slug),
              ),
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
  const { tag, posts, tags, seo } = Route.useLoaderData();
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: '/blog/tag/$tagSlug' });
  const router = useRouter();
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.blog, href: boardUrl(seo.origin, BOARD_PATHS.blog) },
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
        filters={<BlogTagChips tags={tags} activeTagSlug={tag.slug} />}
        posts={posts.data}
        empty={{
          title: m.blogIndex_emptyTitle(),
          description: m.blogTag_emptyText({ tag: tag.name }),
          action: { label: m.blogIndex_browseAllLabel(), href: '/blog' },
        }}
        pagination={
          <CursorPagination
            hasPrevious={Boolean(search.cursor)}
            hasNext={Boolean(posts.hasMore && posts.nextCursor)}
            nextHref={
              posts.nextCursor
                ? cursorPageHref(location.href, posts.nextCursor)
                : undefined
            }
            onPrevious={() => router.history.back()}
            onNext={
              posts.hasMore && posts.nextCursor
                ? () =>
                    navigate({
                      to: '/blog/tag/$tagSlug',
                      params: { tagSlug: tag.slug },
                      search: { cursor: posts.nextCursor ?? undefined },
                    })
                : undefined
            }
          />
        }
      />
    </>
  );
}
