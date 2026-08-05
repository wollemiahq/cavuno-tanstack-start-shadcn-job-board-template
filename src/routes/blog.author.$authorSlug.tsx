import { isNotFound } from '@cavuno/board';
import {
  createFileRoute,
  notFound,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import { BlogArchivePage } from '@/components/board/blog-archive-page';
import { CursorPagination } from '@/components/board/cursor-pagination';
import { PublicContentPending } from '@/components/board/public-content-pending';
import { jsonLdHeadScripts } from '@/components/json-ld';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { resolveJobDetailBreadcrumbAriaLabel } from '@/lib/breadcrumb-aria-label';
import { initialsOf } from '@/lib/initials';
import { cursorPageHref, cursorSearchValue } from '@/lib/pagination';
import { getBlogAuthorPage } from '@/server/blog-pages';

interface BlogAuthorSearch {
  cursor?: string;
}

export const Route = createFileRoute('/blog/author/$authorSlug')({
  staticData: { fullBleed: true, ownsMain: true },
  pendingComponent: () => (
    <PublicContentPending label={m.publicContent_loadingLabel()} />
  ),
  validateSearch: (search: Record<string, unknown>): BlogAuthorSearch => ({
    cursor: cursorSearchValue(search.cursor),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    try {
      return await getBlogAuthorPage({
        data: { authorSlug: params.authorSlug, cursor: deps.cursor },
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
  const { author, posts } = Route.useLoaderData();
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: '/blog/author/$authorSlug' });
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
            { name: author.name },
          ],
        }}
        title={author.name}
        description={author.bio}
        avatar={
          <Avatar aria-hidden size="lg" className="size-9">
            {author.avatarUrl ? (
              <AvatarImage src={author.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initialsOf(author.name)}</AvatarFallback>
          </Avatar>
        }
        filters={<AuthorLinks author={author} />}
        posts={posts.data}
        empty={{
          title: m.blogIndex_emptyTitle(),
          description: m.blogAuthor_emptyText({ author: author.name }),
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
                      to: '/blog/author/$authorSlug',
                      params: { authorSlug: author.slug },
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
