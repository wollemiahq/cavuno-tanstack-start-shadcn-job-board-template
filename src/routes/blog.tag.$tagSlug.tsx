import { isNotFound } from '@cavuno/board';
import {
  createFileRoute,
  notFound,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getBoardContext } from '../server/queries';

import { BlogArchivePage } from '@/components/board/blog-archive-page';
import { BlogTagChips } from '@/components/board/blog-tag-chips';
import { CursorPagination } from '@/components/board/cursor-pagination';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { resolveJobDetailBreadcrumbAriaLabel } from '@/lib/breadcrumb-aria-label';
import {
  cursorPageHref,
  cursorSearchValue,
  type UrlSearchInput,
} from '@/lib/pagination';
import { getBlogTagPage } from '@/server/blog-pages';

interface BlogTagSearch {
  cursor?: string;
}

export const Route = createFileRoute('/blog/tag/$tagSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  validateSearch: (search: UrlSearchInput): BlogTagSearch => ({
    cursor: cursorSearchValue(search.cursor),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const board = await getBoardContext();
    if (!board.features.blog) throw notFound();
    try {
      return await getBlogTagPage({
        data: { tagSlug: params.tagSlug, cursor: deps.cursor },
      });
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
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
  const { tag, posts, tags } = Route.useLoaderData();
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: '/blog/tag/$tagSlug' });
  const router = useRouter();
  const crumbs = breadcrumbsCopy();
  const ariaLabel = resolveJobDetailBreadcrumbAriaLabel();

  return (
    <>
      <BlogArchivePage
        breadcrumb={{
          ariaLabel,
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
