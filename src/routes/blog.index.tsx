import { createFileRoute, getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { File02 } from "@untitledui/icons";

import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { JsonLd } from "@/components/json-ld";
import { AlertsBand } from "@/components/board/alerts-band";
import { ListingPageHeader } from "@/components/board/listing-page-header";
import { PageBody } from "@/components/board/page-body";
import { BlogSearchBar } from "../components/blog-search-bar";
import { PostCard } from "../components/post-card";
import { createBreadcrumbJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { getSeoBase, listBlogPosts, listBlogTags, searchBlogPosts, subscribeJobAlert } from "../server/queries";

interface BlogSearch {
  cursor?: string;
  q?: string;
}

export const Route = createFileRoute("/blog/")({
  staticData: { fullBleed: true },
  validateSearch: (search: Record<string, unknown>): BlogSearch => ({
    cursor: typeof search.cursor === "string" && search.cursor ? search.cursor : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
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
              name: "description",
              content: m.blogIndex_metaDescription({
                boardName: loaderData.seo.boardName,
              }),
            },
          ],
          links: [{ rel: "canonical", href: `${loaderData.seo.origin}/blog` }],
        }
      : { meta: [{ title: m.blogIndex_title() }] },
  component: BlogPage,
});

const rootApi = getRouteApi("__root__");

function BlogPage() {
  const { page, tags, seo, q } = Route.useLoaderData();
  const { board } = rootApi.useLoaderData();
  const navigate = useNavigate({ from: "/blog/" });
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;

  const jsonLd = [
    createBreadcrumbJsonLd([{ label: crumbs.home, href: seo.origin }, { label: crumbs.blog }]),
  ].filter((e): e is Record<string, unknown> => e !== null);

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageBody
        band={
          <ListingPageHeader
            breadcrumb={{
              ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
              items: [{ name: crumbs.home, href: "/" }, { name: crumbs.blog }],
            }}
            title={m.blogIndex_title()}
            subtitle={m.blogIndex_subtitleText()}
            search={<BlogSearchBar defaultValue={q ?? undefined} />}
          />
        }
      >
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          to="/blog"
          search={{}}
          className="rounded-full outline-focus-ring transition duration-100 ease-linear hover:opacity-75 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-1"
        >
          <Badge type="pill-color" color={q ? "gray" : "brand"} size="md">
            {m.blogIndex_allTagsLabel()}
          </Badge>
        </Link>
        {tags.map((tag) => (
          <Link
            key={tag.id}
            to="/blog/tag/$tagSlug"
            params={{ tagSlug: tag.slug }}
            className="rounded-full outline-focus-ring transition duration-100 ease-linear hover:opacity-75 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-1"
          >
            <Badge type="pill-color" color="gray" size="md">
              {tag.name}
            </Badge>
          </Link>
        ))}
      </div>

      {page.data.length === 0 ? (
        <EmptyState size="sm" className="py-12">
          <EmptyState.Header>
            <EmptyState.FeaturedIcon icon={File02} color="gray" theme="modern" />
          </EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>{m.blogIndex_title()}</EmptyState.Title>
            <EmptyState.Description>
              {q ? m.blogIndex_noMatchText({ query: q }) : m.blogIndex_emptyText()}
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {page.data.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {page.hasMore && page.nextCursor ? (
        <div className="flex justify-center">
          <Button
            color="secondary"
            size="lg"
            onClick={() =>
              navigate({
                to: "/blog",
                search: (prev) => ({ ...prev, cursor: page.nextCursor ?? undefined }),
              })
            }
          >
            {m.blogIndex_loadMoreLabel()}
          </Button>
        </div>
      ) : null}
      </PageBody>

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
