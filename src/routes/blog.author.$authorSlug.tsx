import { boardCopy } from '#/copy';

import { isNotFound } from '@cavuno/board';
import {
  createAuthorProfileJsonLd,
  createBreadcrumbJsonLd,
} from '@cavuno/board/seo';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';

import { BlogArchivePage } from '@/components/board/blog-archive-page';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { JsonLd } from '@/components/json-ld';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initialsOf } from '@/lib/initials';
import { m } from '@/paraglide/messages';
import { getBlogAuthor, getSeoBase, listBlogPosts } from '@/server/queries';

interface BlogAuthorSearch {
  cursor?: string;
}

export const Route = createFileRoute('/blog/author/$authorSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  validateSearch: (search: Record<string, unknown>): BlogAuthorSearch => ({
    cursor:
      typeof search.cursor === 'string' && search.cursor
        ? search.cursor
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    try {
      const [author, posts, seo] = await Promise.all([
        getBlogAuthor({ data: { authorSlug: params.authorSlug } }),
        listBlogPosts({
          data: {
            authorSlug: params.authorSlug,
            cursor: deps.cursor,
            limit: 24,
          },
        }),
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
            {
              title: m.blogAuthor_metaTitle({ author: loaderData.author.name }),
            },
            {
              name: 'description',
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
              rel: 'canonical',
              href: `${loaderData.seo.origin}/blog/author/${loaderData.author.slug}`,
            },
          ],
        }
      : {},
  component: AuthorPage,
  notFoundComponent: BlogAuthorNotFound,
});

function BlogAuthorNotFound() {
  return (
    <BlogArchivePage
      breadcrumb={{
        ariaLabel: m.blogIndex_breadcrumbLabel(),
        items: [
          { name: m.blogIndex_homeLabel(), href: '/' },
          { name: m.blogIndex_title(), href: '/blog' },
          { name: m.blogAuthor_notFoundText() },
        ],
      }}
      title={m.blogAuthor_notFoundText()}
      posts={[]}
      empty={{
        title: m.blogAuthor_notFoundText(),
        description: m.blogAuthor_notFoundDescription(),
        action: { label: m.blogPost_backToBlogLabel(), href: '/blog' },
      }}
    />
  );
}

function AuthorLinks({
  author,
}: {
  author: ReturnType<typeof Route.useLoaderData>['author'];
}) {
  const links = [
    author.websiteUrl
      ? { href: author.websiteUrl, label: m.blogPost_authorWebsiteLabel() }
      : null,
    author.twitterUrl
      ? { href: author.twitterUrl, label: m.blogPost_authorXLabel() }
      : null,
    author.linkedinUrl
      ? { href: author.linkedinUrl, label: m.blogPost_authorLinkedinLabel() }
      : null,
    author.githubUrl
      ? { href: author.githubUrl, label: m.blogPost_authorGithubLabel() }
      : null,
  ].filter((link) => link !== null);

  return links.length > 0 ? (
    <div className="flex flex-wrap gap-3 text-sm">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/30 rounded-sm outline-none hover:underline focus-visible:ring-3"
        >
          {link.label}
        </a>
      ))}
    </div>
  ) : null;
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
            { name: author.name },
          ],
        }}
        title={author.name}
        description={author.bio}
        avatar={
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-14">
              {author.avatarUrl ? (
                <AvatarImage src={author.avatarUrl} alt={author.name} />
              ) : null}
              <AvatarFallback>{initialsOf(author.name)}</AvatarFallback>
            </Avatar>
            <AuthorLinks author={author} />
          </div>
        }
        posts={posts.data}
        empty={{
          title: m.blogIndex_emptyTitle(),
          description: m.blogAuthor_emptyText({ author: author.name }),
          action: { label: m.blogIndex_browseAllLabel(), href: '/blog' },
        }}
        nextLink={
          posts.hasMore && posts.nextCursor ? (
            <Link
              to="/blog/author/$authorSlug"
              params={{ authorSlug: author.slug }}
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
