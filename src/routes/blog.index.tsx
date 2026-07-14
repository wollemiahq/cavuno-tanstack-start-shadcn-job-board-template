import { boardCopy } from '#/copy';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';

import { AlertsBand } from '@/components/board/alerts-band';
import { BlogArchivePage } from '@/components/board/blog-archive-page';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { JsonLd } from '@/components/json-ld';
import { Badge } from '@/components/ui/badge';
import { m } from '@/paraglide/messages';
import {
  getSeoBase,
  listBlogPosts,
  listBlogTags,
  searchBlogPosts,
  subscribeJobAlert,
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
    cursor:
      typeof search.cursor === 'string' && search.cursor
        ? search.cursor
        : undefined,
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [page, tags, seo] = await Promise.all([
      deps.q
        ? searchBlogPosts({ data: { query: deps.q, cursor: deps.cursor } })
        : listBlogPosts({ data: { cursor: deps.cursor, limit: 12 } }),
      listBlogTags({ data: {} }),
      getSeoBase(),
    ]);
    return { page, tags: tags.data, seo, q: deps.q ?? null };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: m.blogIndex_title() },
            {
              name: 'description',
              content: m.blogIndex_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [{ rel: 'canonical', href: `${loaderData.seo.origin}/blog` }],
        }
      : { meta: [{ title: m.blogIndex_title() }] },
  component: BlogPage,
});

const rootApi = getRouteApi('__root__');

function BlogPage() {
  const { page, tags, seo, q } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
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
        breadcrumb={{
          ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
          items: [{ name: crumbs.home, href: '/' }, { name: crumbs.blog }],
        }}
        title={m.blogIndex_title()}
        description={m.blogIndex_subtitleText()}
        filters={
          <nav
            aria-label={m.blogIndex_topicsLabel()}
            className="flex flex-wrap gap-2"
          >
            <Link
              to="/blog"
              search={{}}
              className="focus-visible:ring-ring/30 rounded-2xl outline-none focus-visible:ring-3"
            >
              <Badge variant={q ? 'secondary' : 'default'}>
                {m.blogIndex_allTagsLabel()}
              </Badge>
            </Link>
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to="/blog/tag/$tagSlug"
                params={{ tagSlug: tag.slug }}
                className="focus-visible:ring-ring/30 rounded-2xl outline-none focus-visible:ring-3"
              >
                <Badge
                  variant="secondary"
                  className="h-auto max-w-full whitespace-normal"
                >
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </nav>
        }
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
        nextLink={
          page.hasMore && page.nextCursor ? (
            <Link
              to="/blog"
              search={(previous) => ({
                ...previous,
                cursor: page.nextCursor ?? undefined,
              })}
            >
              {m.blogIndex_nextResultsLabel()}
            </Link>
          ) : undefined
        }
      />

      {board.features.jobAlerts ? (
        <AlertsBand
          language={board.language}
          labels={board.labels}
          source="blog_list"
          onSubscribe={async (input) => {
            const result = await subscribeJobAlert({ data: input });
            return { status: result.status };
          }}
        />
      ) : null}
    </>
  );
}
