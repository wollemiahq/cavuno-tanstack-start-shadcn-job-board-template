/**
 * Route-family-owned server boundary for blog archive + post + tag + author.
 * Head meta + JSON-LD live here so route modules drop `@cavuno/board/seo`.
 */
import { isNotFound } from '@cavuno/board';
import {
  BOARD_PATHS,
  blogAuthorPath,
  blogPostPath,
  blogTagPath,
} from '@cavuno/board/paths';
import {
  createAuthorProfileJsonLd,
  createBlogArticleJsonLd,
  createBreadcrumbJsonLd,
} from '@cavuno/board/seo';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { BLOG_PAGE_SIZE } from '../lib/blog';
import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { readPublicOrigin } from '../lib/public-origin';
import { selectRelatedPosts } from '../lib/related-posts';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';
import { EMPTY_ADJACENT } from './queries';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { selfUrl } from '@/lib/self-url';
import type { PublicBlogAdjacentPosts } from '@cavuno/board';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects<T>(value: T): JsonObject[] {
  // SAFETY: Structured data is composed from literal schema.org objects and
  // SDK SEO builders, then JSON round-tripped to erase readonly helper types.
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

async function seoBase() {
  const [boardContext, origin] = await Promise.all([
    readBoardContext(),
    readPublicOrigin(),
  ]);
  return {
    boardName: boardContext.name,
    language: boardContext.language,
    origin,
  };
}

type BoardErrorLike = {
  code?: string;
};

function isBlogDisabled<T>(error: T): boolean {
  if (error === null || error === undefined || Object(error) !== error) {
    return false;
  }
  // SAFETY: Caught Board API errors may expose a string `code`; this guard
  // only reads that optional field and treats all other shapes as non-blog errors.
  return (error as BoardErrorLike).code === 'blog_disabled';
}

const blogRead = async <T>(read: () => Promise<T>): Promise<T> => {
  try {
    return await read();
  } catch (error) {
    if (isBlogDisabled(error)) throw notFound();
    throw error;
  }
};

export const getBlogIndexPage = createServerFn({ method: 'GET' })
  .validator((input: { cursor?: string; q?: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [page, tags, seo] = await Promise.all([
        data.q
          ? blogRead(() =>
              board.blog.search(
                { query: data.q!, cursor: data.cursor },
                undefined,
                { headers },
              ),
            )
          : blogRead(() =>
              board.blog.posts.list(
                { cursor: data.cursor, limit: BLOG_PAGE_SIZE },
                { headers },
              ),
            ),
        blogRead(() => board.blog.tags.list(undefined, { headers })).catch(
          () => null,
        ),
        seoBase(),
      ]);
      const head = {
        meta: [
          { title: headTitle(seo.boardName, m.blogIndex_title()) },
          {
            name: 'description',
            content: m.blogIndex_metaDescription({ boardName: seo.boardName }),
          },
        ],
        links: [
          { rel: 'canonical', href: selfUrl(seo.origin, BOARD_PATHS.blog) },
        ],
      };
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.blog },
          ]),
        ].filter((e) => e !== null),
      );
      return {
        page,
        tags: tags?.data ?? [],
        seo,
        q: data.q ?? null,
        head,
        jsonLd,
      };
    }),
  );

export const getBlogPostPage = createServerFn({ method: 'GET' })
  .validator((input: { postSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const post = await blogRead(() =>
        board.blog.posts.retrieve(data.postSlug, undefined, { headers }),
      );
      const firstTagSlug = post.tags[0]?.slug ?? null;
      const [adjacent, byTag, latest, seo]: [
        PublicBlogAdjacentPosts,
        Awaited<ReturnType<typeof board.blog.posts.list>> | null,
        Awaited<ReturnType<typeof board.blog.posts.list>> | null,
        Awaited<ReturnType<typeof seoBase>>,
      ] = await Promise.all([
        blogRead(() => board.blog.posts.adjacent(post.slug, { headers })).catch(
          (error) => {
            if (isNotFound(error)) return EMPTY_ADJACENT;
            throw error;
          },
        ),
        firstTagSlug
          ? blogRead(() =>
              board.blog.posts.list(
                { tagSlug: firstTagSlug, limit: 4 },
                { headers },
              ),
            ).catch(() => null)
          : Promise.resolve(null),
        blogRead(() => board.blog.posts.list({ limit: 4 }, { headers })).catch(
          () => null,
        ),
        seoBase(),
      ]);
      const related = selectRelatedPosts({
        currentId: post.id,
        byTag: byTag?.data ?? [],
        latest: latest?.data ?? [],
        limit: 3,
      });
      const ogImage =
        post.ogImageUrl ?? `${seo.origin}${blogPostPath(post.slug)}/og`;
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, post.seoTitle ?? post.title),
          },
          ...((post.seoDescription ?? post.customExcerpt)
            ? [
                {
                  name: 'description',
                  content: (post.seoDescription ?? post.customExcerpt)!,
                },
              ]
            : []),
          { property: 'og:image', content: ogImage },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:image', content: ogImage },
        ],
        links: [
          {
            rel: 'canonical',
            href:
              post.canonicalUrl ?? selfUrl(seo.origin, blogPostPath(post.slug)),
          },
        ],
      };
      const permalink =
        post.canonicalUrl ?? `${seo.origin}${blogPostPath(post.slug)}`;
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          createBlogArticleJsonLd({
            post,
            boardName: seo.boardName,
            permalink,
            ogImageUrl: ogImage,
          }),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.blog, href: `${seo.origin}/blog` },
            { label: post.title },
          ]),
        ].filter((e) => e !== null),
      );
      return { post, adjacent, related, seo, head, jsonLd };
    }),
  );

export const getBlogTagPage = createServerFn({ method: 'GET' })
  .validator((input: { tagSlug: string; cursor?: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [tag, posts, tags, seo] = await Promise.all([
        blogRead(() =>
          board.blog.tags.retrieve(data.tagSlug, undefined, { headers }),
        ),
        blogRead(() =>
          board.blog.posts.list(
            {
              tagSlug: data.tagSlug,
              cursor: data.cursor,
              limit: BLOG_PAGE_SIZE,
            },
            { headers },
          ),
        ),
        blogRead(() => board.blog.tags.list(undefined, { headers })).catch(
          () => null,
        ),
        seoBase(),
      ]);
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, tag.name, m.blogIndex_title()),
          },
          {
            name: 'description',
            content:
              tag.description ??
              m.blogTag_metaDescription({
                tag: tag.name,
                boardName: seo.boardName,
              }),
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, blogTagPath(tag.slug)),
          },
        ],
      };
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.blog, href: selfUrl(seo.origin, BOARD_PATHS.blog) },
            { label: tag.name },
          ]),
        ].filter((e) => e !== null),
      );
      return {
        tag,
        posts,
        tags: tags?.data ?? [],
        seo,
        head,
        jsonLd,
      };
    }),
  );

export const getBlogAuthorPage = createServerFn({ method: 'GET' })
  .validator((input: { authorSlug: string; cursor?: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [author, posts, seo] = await Promise.all([
        blogRead(() =>
          board.blog.authors.retrieve(data.authorSlug, undefined, {
            headers,
          }),
        ),
        blogRead(() =>
          board.blog.posts.list(
            {
              authorSlug: data.authorSlug,
              cursor: data.cursor,
              limit: BLOG_PAGE_SIZE,
            },
            { headers },
          ),
        ),
        seoBase(),
      ]);
      const description =
        author.bio ??
        m.blogAuthor_metaDescription({
          author: author.name,
          boardName: seo.boardName,
        });
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, author.name, m.blogIndex_title()),
          },
          {
            name: 'description',
            content: description,
          },
        ],
        links: [
          {
            rel: 'canonical',
            href: selfUrl(seo.origin, blogAuthorPath(author.slug)),
          },
        ],
      };
      const c = breadcrumbsCopy();
      const permalink = selfUrl(seo.origin, blogAuthorPath(author.slug));
      const jsonLd = asJsonObjects(
        [
          createAuthorProfileJsonLd({
            author,
            canonical: permalink,
            description,
            origin: seo.origin,
            posts: posts.data,
            totalPosts: posts.count ?? posts.data.length,
          }),
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.blog, href: selfUrl(seo.origin, BOARD_PATHS.blog) },
            { label: author.name },
          ]),
        ].filter((e) => e !== null),
      );
      return { author, posts, seo, head, jsonLd };
    }),
  );
