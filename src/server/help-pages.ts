/**
 * Route-family-owned server boundary for the help center: its home, a
 * category's page and an article's page, over `board.help.*`. Head meta,
 * JSON-LD and the footer trail live here so route modules drop
 * `@cavuno/board/seo`.
 *
 * The API returns only what the operator has published, in the operator's
 * order, so nothing here sorts. A board with nothing published answers two
 * empty lists and an unknown slug answers 404: both are the page's 404.
 */
import { isBoardApiError, isNotFound } from '@cavuno/board';
import {
  BOARD_PATHS,
  helpArticlePath,
  helpCategoryPath,
} from '@cavuno/board/paths';
import {
  createBreadcrumbJsonLd,
  createHelpArticleJsonLd,
} from '@cavuno/board/seo';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { searchHelpArticles } from '../lib/help-search';
import { headTitle } from '../lib/page-title';
import { readPublicOrigin } from '../lib/public-origin';
import { selfUrl } from '../lib/self-url';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

/** The most categories and articles the help home reads: one page of each. */
const HELP_HOME_LIMIT = 100;

/**
 * The most pages of articles a search reads. A board holds at most 500
 * published articles, so five pages of `HELP_HOME_LIMIT` are all of them.
 */
const HELP_SEARCH_MAX_PAGES = 5;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects<T>(value: T): JsonObject[] {
  // SAFETY: Structured data is composed from SDK SEO builders, then JSON
  // round-tripped to erase readonly helper types.
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

interface TrailItem {
  name: string;
  /** Canonical path; the last item has none. */
  path?: string;
}

/** The footer trail and its `BreadcrumbList`, from one list of crumbs. */
function trail(origin: string, items: TrailItem[]) {
  return {
    breadcrumbTrail: items.map(({ name, path }) =>
      path ? { name, href: path } : { name },
    ),
    breadcrumbJsonLd: createBreadcrumbJsonLd(
      items.map(({ name, path }) =>
        path ? { label: name, href: selfUrl(origin, path) } : { label: name },
      ),
    ),
  };
}

async function seoBase() {
  const [boardContext, origin] = await Promise.all([
    readBoardContext(),
    readPublicOrigin(),
  ]);
  return { boardName: boardContext.name, origin };
}

const helpRead = async <T>(read: () => Promise<T>): Promise<T> => {
  try {
    return await read();
  } catch (error) {
    if (isNotFound(error)) throw notFound();
    throw error;
  }
};

/**
 * `/help` — every category with its articles, in the operator's order. With
 * a query (`/help?q=…`, from the header's search field) it answers the
 * articles that match instead, read from every page of the board's articles.
 */
export const getHelpHomePage = createServerFn({ method: 'GET' })
  .validator((input: { q?: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const readArticles = (cursor?: string) =>
        helpRead(() =>
          board.help.articles.list(
            { limit: HELP_HOME_LIMIT, cursor },
            { headers },
          ),
        );
      // A search matches against every article; the browse view shows the
      // first page and sends each category to its own page for the rest.
      const readAllArticles = async () => {
        const first = await readArticles();
        const all = [...first.data];
        let page = first;
        for (
          let read = 1;
          read < HELP_SEARCH_MAX_PAGES && page.hasMore && page.nextCursor;
          read += 1
        ) {
          page = await readArticles(page.nextCursor);
          all.push(...page.data);
        }
        return { ...first, data: all, hasMore: false };
      };
      const [categories, articles, seo] = await Promise.all([
        helpRead(() =>
          board.help.categories.list({ limit: HELP_HOME_LIMIT }, { headers }),
        ),
        data.q ? readAllArticles() : readArticles(),
        seoBase(),
      ]);
      // Nothing published: the help center does not exist yet.
      if (categories.data.length === 0 && articles.data.length === 0) {
        throw notFound();
      }
      const crumbs = breadcrumbsCopy();
      const { breadcrumbTrail, breadcrumbJsonLd } = trail(seo.origin, [
        { name: crumbs.home, path: BOARD_PATHS.home },
        { name: m.help_title() },
      ]);
      const description = m.help_metaDescription({
        boardName: seo.boardName,
      });
      const canonical = selfUrl(seo.origin, BOARD_PATHS.help);
      return {
        // A search shows its results in place of the categories.
        groups: data.q
          ? []
          : categories.data.map((category) => ({
              category,
              articles: articles.data.filter(
                (article) => article.category.id === category.id,
              ),
            })),
        // The page of articles is not all of them: each category links to
        // its own page for the rest.
        hasMoreArticles: articles.hasMore === true,
        search: data.q
          ? {
              query: data.q,
              results: searchHelpArticles(articles.data, data.q),
            }
          : null,
        head: {
          meta: [
            { title: headTitle(seo.boardName, m.help_title()) },
            { name: 'description', content: description },
            { property: 'og:title', content: m.help_title() },
            { property: 'og:description', content: description },
            { property: 'og:url', content: canonical },
          ],
          links: [{ rel: 'canonical', href: canonical }],
        },
        jsonLd: asJsonObjects([breadcrumbJsonLd].filter((e) => e !== null)),
        breadcrumbTrail,
      };
    }),
  );

/** `/help/categories/<slug>` — one category's articles, a page at a time. */
export const getHelpCategoryPage = createServerFn({ method: 'GET' })
  .validator((input: { helpCategorySlug: string; cursor?: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const list = (cursor: string | undefined) =>
        helpRead(() =>
          board.help.articles.list(
            { categorySlug: data.helpCategorySlug, cursor },
            { headers },
          ),
        );
      // A cursor only continues the list that minted it. One the API can no
      // longer continue (tampered, or from another category) gets the first
      // page instead of an error, and the route must not offer Previous.
      const readArticles = async () => {
        try {
          return { ...(await list(data.cursor)), restarted: false };
        } catch (error) {
          if (
            data.cursor &&
            isBoardApiError(error) &&
            error.code === 'pagination_invalid_cursor'
          ) {
            return { ...(await list(undefined)), restarted: true };
          }
          throw error;
        }
      };
      const [category, articles, seo] = await Promise.all([
        helpRead(() =>
          board.help.categories.retrieve(data.helpCategorySlug, undefined, {
            headers,
          }),
        ),
        readArticles(),
        seoBase(),
      ]);
      const crumbs = breadcrumbsCopy();
      const { breadcrumbTrail, breadcrumbJsonLd } = trail(seo.origin, [
        { name: crumbs.home, path: BOARD_PATHS.home },
        { name: m.help_title(), path: BOARD_PATHS.help },
        { name: category.title },
      ]);
      const description =
        category.description ??
        m.helpCategory_metaDescription({
          category: category.title,
          boardName: seo.boardName,
        });
      const canonical = selfUrl(seo.origin, helpCategoryPath(category.slug));
      return {
        category,
        articles,
        head: {
          meta: [
            {
              title: headTitle(seo.boardName, category.title, m.help_title()),
            },
            { name: 'description', content: description },
            { property: 'og:title', content: category.title },
            { property: 'og:description', content: description },
            { property: 'og:url', content: canonical },
          ],
          links: [{ rel: 'canonical', href: canonical }],
        },
        jsonLd: asJsonObjects([breadcrumbJsonLd].filter((e) => e !== null)),
        breadcrumbTrail,
      };
    }),
  );

/** How many other articles of its category an article page lists. */
const HELP_ARTICLE_MORE_LIMIT = 5;

/**
 * `/help/articles/<slug>` — one article with its body. An old slug still
 * resolves, with `redirected` and `newSlug` set; the route loader answers
 * that with a permanent redirect before anything renders.
 */
export const getHelpArticlePage = createServerFn({ method: 'GET' })
  .validator((input: { helpArticleSlug: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const board = getBoard();
      const [article, seo] = await Promise.all([
        helpRead(() =>
          board.help.articles.retrieve(data.helpArticleSlug, undefined, {
            headers,
          }),
        ),
        seoBase(),
      ]);
      // An old slug redirects before anything renders, so it needs no list.
      const siblings = article.redirected
        ? null
        : await helpRead(() =>
            board.help.articles.list(
              {
                categorySlug: article.category.slug,
                // One spare, since the list can include this article.
                limit: HELP_ARTICLE_MORE_LIMIT + 1,
              },
              { headers },
            ),
          );
      const others = (siblings?.data ?? []).filter(
        (other) => other.id !== article.id,
      );
      const crumbs = breadcrumbsCopy();
      const { breadcrumbTrail, breadcrumbJsonLd } = trail(seo.origin, [
        { name: crumbs.home, path: BOARD_PATHS.home },
        { name: m.help_title(), path: BOARD_PATHS.help },
        {
          name: article.category.title,
          path: helpCategoryPath(article.category.slug),
        },
        { name: article.title },
      ]);
      const canonical = selfUrl(seo.origin, helpArticlePath(article.slug));
      return {
        article,
        moreInCategory: {
          articles: others.slice(0, HELP_ARTICLE_MORE_LIMIT),
          hasMore:
            Boolean(siblings?.hasMore) ||
            others.length > HELP_ARTICLE_MORE_LIMIT,
        },
        head: {
          meta: [
            { title: headTitle(seo.boardName, article.title) },
            ...(article.summary
              ? [
                  { name: 'description', content: article.summary },
                  { property: 'og:description', content: article.summary },
                ]
              : []),
            { property: 'og:title', content: article.title },
            { property: 'og:type', content: 'article' },
            { property: 'og:url', content: canonical },
            { property: 'og:site_name', content: seo.boardName },
            {
              property: 'article:published_time',
              content: article.publishedAt,
            },
            {
              property: 'article:modified_time',
              content: article.updatedAt,
            },
          ],
          links: [{ rel: 'canonical', href: canonical }],
        },
        jsonLd: asJsonObjects(
          [
            createHelpArticleJsonLd({
              article,
              boardName: seo.boardName,
              permalink: canonical,
            }),
            breadcrumbJsonLd,
          ].filter((e) => e !== null),
        ),
        breadcrumbTrail,
      };
    }),
  );
