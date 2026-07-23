import { boardCopy } from '#/copy';

import { BOARD_PATHS, boardUrl } from '@cavuno/board/paths';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import {
  createFileRoute,
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
  getSeoBase,
  listBlogPosts,
  listBlogTags,
  searchBlogPosts,
} from '@/server/queries';

interface BlogSearch {
  cursor?: string;
  q?: string;
}

export const Route = createFileRoute('/blog/')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  validateSearch: (search: Record<string, unknown>): BlogSearch => ({
    cursor: cursorSearchValue(search.cursor),
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [page, tags, seo] = await Promise.all([
      deps.q
        ? searchBlogPosts({ data: { query: deps.q, cursor: deps.cursor } })
        : listBlogPosts({
            data: { cursor: deps.cursor, limit: BLOG_PAGE_SIZE },
          }),
      listBlogTags({ data: {} }),
      getSeoBase(),
    ]);
    return { page, tags: tags.data, seo, q: deps.q ?? null };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: headTitle(loaderData?.seo.boardName, m.blogIndex_title()),
            },
            {
              name: 'description',
              content: m.blogIndex_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [
            {
              rel: 'canonical',
              href: boardUrl(loaderData.seo.origin, BOARD_PATHS.blog),
            },
          ],
        }
      : { meta: [{ title: headTitle(undefined, m.blogIndex_title()) }] },
  component: BlogPage,
});

function BlogPage() {
  const { page, tags, seo, q } = Route.useLoaderData();
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: '/blog/' });
  const router = useRouter();
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;
  const jsonLd = [
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.blog },
    ]),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);

  return (
    <>
      <JsonLd data={jsonLd} />
      <BlogArchivePage
        title={m.blogIndex_title()}
        description={m.blogIndex_subtitleText()}
        filters={<BlogTagChips tags={tags} allActive={!q} />}
        posts={page.data}
        empty={{
          title: m.blogIndex_emptyTitle(),
          description: q
            ? m.blogIndex_noMatchText({ query: q })
            : m.blogIndex_emptyText(),
          action: q
            ? { label: m.blogIndex_browseAllLabel(), href: '/blog' }
            : undefined,
        }}
        pagination={
          <CursorPagination
            hasPrevious={Boolean(search.cursor)}
            hasNext={Boolean(page.hasMore && page.nextCursor)}
            nextHref={
              page.nextCursor
                ? cursorPageHref(location.href, page.nextCursor)
                : undefined
            }
            onPrevious={() => router.history.back()}
            onNext={
              page.hasMore && page.nextCursor
                ? () =>
                    navigate({
                      to: '/blog',
                      search: (previous) => ({
                        ...previous,
                        cursor: page.nextCursor ?? undefined,
                      }),
                    })
                : undefined
            }
          />
        }
      />
    </>
  );
}
