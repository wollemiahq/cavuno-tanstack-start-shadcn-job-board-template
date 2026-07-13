import { Text } from "@/components/text"
import { createFileRoute, notFound } from "@tanstack/react-router";

import { isNotFound } from "@cavuno/board";
import { createAuthorProfileJsonLd, createBreadcrumbJsonLd } from "@cavuno/board/seo";

import { Avatar } from "@/components/base/avatar/avatar";
import { JsonLd } from "@/components/json-ld";
import { PageBody } from "@/components/board/page-body";
import { BlogSearchBar } from "../components/blog-search-bar";
import { PostCard } from "../components/post-card";
import { boardCopy } from "#/copy";
import { m } from "../paraglide/messages";
import { getBlogAuthor, getSeoBase, listBlogPosts } from "../server/queries";

export const Route = createFileRoute("/blog/author/$authorSlug")({
  // Full-bleed so PageBody owns the container + the breadcrumb placement.
  staticData: { fullBleed: true },
  loader: async ({ params }) => {
    try {
      const [author, posts, seo] = await Promise.all([
        getBlogAuthor({ data: { authorSlug: params.authorSlug } }),
        listBlogPosts({ data: { authorSlug: params.authorSlug, limit: 24 } }),
        getSeoBase(),
      ]);
      return { author, posts, seo };
    } catch (error) {
      if (isNotFound(error)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: m.blogAuthor_metaTitle({ author: loaderData.author.name }) },
            {
              name: "description",
              content:
                loaderData.author.bio ??
                m.blogAuthor_metaDescription({
                  author: loaderData.author.name,
                  boardName: loaderData.seo.boardName,
                }),
            },
          ],
          links: [
            {
              rel: "canonical",
              href: `${loaderData.seo.origin}/blog/author/${loaderData.author.slug}`,
            },
          ],
        }
      : {},
  component: AuthorPage,
  notFoundComponent: () => (
    <p className="rounded-xl bg-primary p-10 text-center text-tertiary ring-1 ring-secondary_alt">
      {m.blogAuthor_notFoundText()}
    </p>
  ),
});

/** Two-letter author initials for the avatar fallback (mirrors JobCard). */
function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0]!)
      .slice(0, 2)
      .join("")
      .toUpperCase() || undefined
  );
}

function AuthorPage() {
  const { author, posts, seo } = Route.useLoaderData();
  const permalink = `${seo.origin}/blog/author/${author.slug}`;
  const copy = boardCopy(seo.language, seo.labels);
  const crumbs = copy.breadcrumbs;
  const jsonLd = [
    createAuthorProfileJsonLd({
      author,
      canonical: permalink,
      // Same copy as the page's meta description (hosted passes its bio/hero).
      description:
        author.bio ??
        m.blogAuthor_metaDescription({
          author: author.name,
          boardName: seo.boardName,
        }),
      origin: seo.origin,
      posts: posts.data,
      totalPosts: posts.count ?? posts.data.length,
    }),
    createBreadcrumbJsonLd([
      { label: crumbs.home, href: seo.origin },
      { label: crumbs.blog, href: `${seo.origin}/blog` },
      { label: author.name },
    ]),
  ].filter((e): e is Record<string, unknown> => e !== null);
  return (
    <PageBody
      breadcrumb={{
        ariaLabel: copy.jobDetail.breadcrumbAriaLabel,
        items: [
          { name: crumbs.home, href: "/" },
          { name: crumbs.blog, href: "/blog" },
          { name: author.name },
        ],
      }}
    >
      <JsonLd data={jsonLd} />

      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar size="xl" src={author.avatarUrl} initials={initialsOf(author.name)} alt={author.name} />
          <div className="min-w-0 flex flex-col gap-1">
            <Text as="h1" variant="heading2" className="md:text-display-sm">{author.name}</Text>
            {author.bio ? <p className="text-tertiary">{author.bio}</p> : null}
          </div>
        </div>
        <div className="mt-2 max-w-3xl">
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
