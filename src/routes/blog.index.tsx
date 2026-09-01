import {
  createFileRoute,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';
import { getBoardContext } from '../server/queries';
import { createBlogIndexLoader, type BlogSearch } from './-blog-index-loader';

import { BlogArchivePage } from '@/components/board/blog-archive-page';
import { BlogTagChips } from '@/components/board/blog-tag-chips';
import { CursorPagination } from '@/components/board/cursor-pagination';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { jsonLdHeadScripts } from '@/components/json-ld';
import {
  cursorPageHref,
  cursorSearchValue,
  searchString,
  type UrlSearchInput,
} from '@/lib/pagination';

export const Route = createFileRoute('/blog/')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  validateSearch: (search: UrlSearchInput): BlogSearch => ({
    cursor: cursorSearchValue(search.cursor),
    q: searchString(search.q),
  }),
  loaderDeps: ({ search }) => search,
  loader: createBlogIndexLoader(undefined, async () => {
    const board = await getBoardContext();
    return board.features.blog === true;
  }),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: BlogPage,
});

function BlogPage() {
  const { page, tags, q } = Route.useLoaderData();
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: '/blog/' });
  const router = useRouter();

  return (
    <>
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
