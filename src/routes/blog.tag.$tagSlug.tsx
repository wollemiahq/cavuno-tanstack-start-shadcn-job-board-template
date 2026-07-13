import { Text } from "@/components/text"
import { createFileRoute, notFound } from "@tanstack/react-router";

import { isNotFound } from "@cavuno/board";

import { JsonLd } from "@/components/json-ld";
import { PageBody } from "@/components/board/page-body";
import { BlogSearchBar } from "../components/blog-search-bar";
import { PostCard } from "../components/post-card";
import { createBreadcrumbJsonLd } from "@cavuno/board/seo";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { getBlogTag, getSeoBase, listBlogPosts } from "../server/queries";

export const Route = createFileRoute("/blog/tag/$tagSlug")({
  // Full-bleed so PageBody owns the container + the breadcrumb placement.
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    try {
      const [tag, posts, seo] = await Promise.all([
        getBlogTag({ data: { tagSlug: params.tagSlug } }),
        listBlogPosts({ data: { tagSlug: params.tagSlug, limit: 24 } }),
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
            { title: m.blogTag_metaTitle({ tag: loaderData.tag.name }) },
            {
              name: "description",
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
              rel: "canonical",
              href: `${loaderData.seo.origin}/blog/tag/${loaderData.tag.slug}`,
            },
          ],
        }
      : {},
  component: TagPage,
  notFoundComponent: () => (
    <p className="rounded-xl bg-primary p-10 text-center text-tertiary ring-1 ring-secondary_alt">
      {m.blogTag_notFoundText()}
    </p>
  ),
});

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
  ].filter((e): e is Record<string, unknown> => e !== null);
  return (
    <PageBody
      breadcrumb={{
        ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
        items: [
          { name: crumbs.home, href: "/" },
          { name: crumbs.blog, href: "/blog" },
          { name: tag.name },
        ],
      }}
    >
      <JsonLd data={jsonLd} />

      <header className="flex max-w-3xl flex-col gap-4">
        <Text as="h1" variant="display">{tag.name}</Text>
        {tag.description ? <p className="text-lg text-tertiary">{tag.description}</p> : null}
        <div className="mt-2">
          <BlogSearchBar />
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.data.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </PageBody>
  );
}
