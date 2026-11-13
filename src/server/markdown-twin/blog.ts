/**
 * The Markdown twins of the blog: the archive, a post and a tag archive.
 *
 * Each builder reads the board's blog flag alongside the page server
 * function its loader calls, with the same input, so a board with the blog
 * off 404s here as its pages do, and board access, the password wall and
 * Board API shedding are unchanged. Like the post page: a retired or alias
 * slug moves to the post's current slug, and a missing post follows the
 * board's configured redirect, else 404s.
 */
import {
  BOARD_PATHS,
  blogAuthorPath,
  blogPostPath,
  blogTagPath,
} from '@cavuno/board/paths';
import { isNotFound } from '@tanstack/react-router';

import { toBlogArticleVM, toBlogPostCardVM } from '../../board/blog-view-model';
import {
  cursorPageHref,
  cursorSearchValue,
  searchQueryString,
} from '../../lib/pagination';
import { selfUrl } from '../../lib/self-url';
import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';
import { loadIfBlogEnabled } from '../../routes/-blog-enabled';
import {
  getBlogIndexPage,
  getBlogPostPage,
  getBlogTagPage,
} from '../blog-pages';
import { getBoardContext, resolveRedirect } from '../queries';
import {
  bulletList,
  escapeInline,
  htmlToMarkdown,
  link,
  markdownDocument,
  section,
} from './format';
import { canonicalOf, routerSearch, type ListingPageData } from './job-listing';
import {
  managedRedirectTwin,
  twinRedirect,
  type ResolveRedirect,
} from './managed-redirect';

import type { MarkdownTwin } from '../../lib/markdown-twin/routes';
import type { MarkdownTwinResult } from './result';
import type {
  PublicBlogAdjacentPosts,
  PublicBlogPost,
  PublicBlogPostSummary,
  PublicBlogTag,
} from '@cavuno/board';

type PageMeta = Pick<ListingPageData, 'seo' | 'head'>;
/** One archive page of posts, as the blog server functions return it. */
type PostPage = {
  data: PublicBlogPostSummary[];
  hasMore?: boolean;
  nextCursor?: string | null;
};
type TagLink = Pick<PublicBlogTag, 'name' | 'slug'>;

/** The parts of the blog server functions' answers the twins read. */
export type BlogTwinDependencies = {
  getBlogIndexPage: (input: {
    data: { cursor?: string; q?: string };
  }) => Promise<PageMeta & { page: PostPage; tags: TagLink[] }>;
  getBlogPostPage: (input: { data: { postSlug: string } }) => Promise<
    PageMeta & {
      post: PublicBlogPost;
      adjacent: PublicBlogAdjacentPosts;
      related: PublicBlogPostSummary[];
    }
  >;
  getBlogTagPage: (input: {
    data: { tagSlug: string; cursor?: string };
  }) => Promise<
    PageMeta & {
      tag: Pick<PublicBlogTag, 'name' | 'slug' | 'description'>;
      posts: PostPage;
      tags: TagLink[];
    }
  >;
  getBoardContext: () => Promise<{ features: { blog?: boolean } }>;
  resolveRedirect: ResolveRedirect;
};

const defaultDependencies: BlogTwinDependencies = {
  getBlogIndexPage,
  getBlogPostPage,
  getBlogTagPage,
  getBoardContext,
  resolveRedirect,
};

/** The page read, or null when the page 404s (the blog is off, or no
 * such post or tag). */
async function readBlogPage<T>(
  dependencies: BlogTwinDependencies,
  read: () => Promise<T>,
): Promise<T | null> {
  try {
    return await loadIfBlogEnabled(
      async () => (await dependencies.getBoardContext()).features.blog === true,
      read,
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** A post as one line: its title linking its page, then its date, first
 * tag and authors, as the post card shows them. */
function postLine(post: PublicBlogPostSummary, origin: string): string {
  const vm = toBlogPostCardVM(post, getLocale());
  const facts = [
    vm.isFeatured ? vm.featuredLabel : null,
    vm.publishedAtLabel,
    post.tags[0]?.name ?? null,
    post.authors.map((author) => author.name).join(', ') || null,
  ].flatMap((fact) => (fact ? [escapeInline(fact)] : []));
  const line = [
    link(post.title, selfUrl(origin, blogPostPath(post.slug))),
    ...facts,
  ].join(' · ');
  return post.customExcerpt
    ? `${line}\n  ${escapeInline(post.customExcerpt)}`
    : line;
}

/** An archive page's twin: heading, intro, posts, the next page and the
 * blog's topics. */
function archiveTwin(options: {
  twin: MarkdownTwin;
  origin: string;
  data: PageMeta;
  title: string;
  description: string | null;
  posts: PostPage;
  tags: TagLink[];
  empty: string;
}): MarkdownTwinResult {
  const { twin, posts } = options;
  const siteOrigin = options.data.seo.origin;
  const next =
    posts.hasMore && posts.nextCursor
      ? link(
          m.pagination_nextPageLabel(),
          `${options.origin}${cursorPageHref(
            `${twin.twinPath}${twin.search}`,
            posts.nextCursor,
          )}`,
        )
      : null;
  const body = markdownDocument([
    `# ${escapeInline(options.title)}`,
    options.description ? escapeInline(options.description) : null,
    bulletList(posts.data.map((post) => postLine(post, siteOrigin))) ??
      escapeInline(options.empty),
    next,
    section(
      m.blogIndex_topicsLabel(),
      bulletList(
        options.tags.map((tag) =>
          link(tag.name, selfUrl(siteOrigin, blogTagPath(tag.slug))),
        ),
      ),
    ),
  ]);
  return {
    type: 'markdown',
    body,
    canonical: canonicalOf(options.data, twin),
  };
}

export async function buildBlogTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: BlogTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const search = routerSearch(twin);
  const cursor = cursorSearchValue(search.cursor);
  const q = searchQueryString(search.q);
  const page = await readBlogPage(dependencies, () =>
    dependencies.getBlogIndexPage({ data: { cursor, q } }),
  );
  if (!page) return { type: 'notFound' };
  return archiveTwin({
    twin,
    origin,
    data: page,
    title: m.blogIndex_title(),
    description: m.blogIndex_subtitleText(),
    posts: page.page,
    tags: page.tags,
    empty: q ? m.blogIndex_noMatchText({ query: q }) : m.blogIndex_emptyText(),
  });
}

export async function buildBlogTagTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: BlogTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { tagSlug = '' } = twin.params;
  const cursor = cursorSearchValue(routerSearch(twin).cursor);
  const page = await readBlogPage(dependencies, () =>
    dependencies.getBlogTagPage({ data: { tagSlug, cursor } }),
  );
  if (!page) return { type: 'notFound' };
  return archiveTwin({
    twin,
    origin,
    data: page,
    title: page.tag.name,
    description: page.tag.description,
    posts: page.posts,
    tags: page.tags,
    empty: m.blogTag_emptyText({ tag: page.tag.name }),
  });
}

function postLinks(
  posts: ReadonlyArray<Pick<PublicBlogPostSummary, 'title' | 'slug'> | null>,
  origin: string,
): string | null {
  return bulletList(
    posts.map((post) =>
      post ? link(post.title, selfUrl(origin, blogPostPath(post.slug))) : null,
    ),
  );
}

export async function buildBlogPostTwin(
  twin: MarkdownTwin,
  origin: string,
  dependencies: BlogTwinDependencies = defaultDependencies,
): Promise<MarkdownTwinResult> {
  const { postSlug = '' } = twin.params;
  const page = await readBlogPage(dependencies, () =>
    dependencies.getBlogPostPage({ data: { postSlug } }),
  );
  if (!page) {
    return managedRedirectTwin(twin, origin, dependencies.resolveRedirect);
  }
  const { post, adjacent, related } = page;
  const target =
    (post.redirected ? post.newSlug : null) ??
    (post.slug !== postSlug ? post.slug : null);
  if (target && target !== postSlug) {
    return twinRedirect(blogPostPath(target), twin.search);
  }

  const siteOrigin = page.seo.origin;
  const vm = toBlogArticleVM(post, getLocale());
  const dateLine = [
    vm.publishedAtLabel,
    post.readingTimeMin
      ? m.blogPost_readingTimeText({ minutes: post.readingTimeMin })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const authors = post.authors.map((author) =>
    link(author.name, selfUrl(siteOrigin, blogAuthorPath(author.slug))),
  );

  const body = markdownDocument([
    `# ${escapeInline(post.title)}`,
    post.customExcerpt ? escapeInline(post.customExcerpt) : null,
    bulletList([
      vm.isFeatured ? escapeInline(vm.featuredLabel) : null,
      dateLine ? escapeInline(dateLine) : null,
      authors.length > 0
        ? `${escapeInline(m.blogPost_updatedByHeading())}: ${authors.join(', ')}`
        : null,
    ]),
    post.html
      ? htmlToMarkdown(post.html)
      : escapeInline(m.blogPost_missingBodyTitle()),
    section(
      m.blogIndex_topicsLabel(),
      bulletList(
        post.tags.map((tag) =>
          link(tag.name, selfUrl(siteOrigin, blogTagPath(tag.slug))),
        ),
      ),
    ),
    section(
      m.blogPost_adjacentPostsLabel(),
      postLinks([adjacent.previous, adjacent.next], siteOrigin),
    ),
    section(m.blogPost_relatedPostsHeading(), postLinks(related, siteOrigin)),
    link(m.blogPost_backToBlogLabel(), selfUrl(siteOrigin, BOARD_PATHS.blog)),
  ]);
  return { type: 'markdown', body, canonical: canonicalOf(page, twin) };
}
