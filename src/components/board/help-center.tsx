'use client';

import { useId, type ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  LifeBuoy,
  Search,
} from 'lucide-react';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import { ArticleToc } from '@/components/article-toc';
import {
  BoardContactButton,
  canContactBoard,
  type BoardContact,
} from '@/components/board/board-contact-button';
import { HelpCategoryIcon } from '@/components/board/help-category-icon';
import {
  Page,
  PageContent,
  PageHeader,
  PageSection,
} from '@/components/layout/page';
import { PageLayout } from '@/components/layout/page-layout';
import { Prose } from '@/components/prose';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { extractToc, withHeadingAnchors } from '@/lib/article-toc';
import type {
  PublicHelpArticle,
  PublicHelpArticleSummary,
  PublicHelpCategory,
} from '@cavuno/board';

export interface HelpCategoryGroup {
  category: PublicHelpCategory;
  articles: PublicHelpArticleSummary[];
}

/** How many of a category's articles its card on the help home previews. */
const HOME_PREVIEW_LIMIT = 5;

const focusRing =
  'focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-3';

/** "12 articles", pluralized and number-formatted for the viewer's locale. */
function articleCountLabel(count: number) {
  return m.help_articleCountText({
    count,
    countLabel: new Intl.NumberFormat(getLocale()).format(count),
  });
}

/**
 * Article rows that share one card: a divider between them, the whole row
 * the link. They carry the card's own inset, so they must sit inside a Card.
 */
function HelpArticleRows({
  articles,
  detail = 'title',
  label,
}: {
  articles: PublicHelpArticleSummary[];
  /** `summary` adds the article's summary; `category` adds its category too. */
  detail?: 'title' | 'summary' | 'category';
  label?: string;
}) {
  return (
    <ul aria-label={label} className="divide-border divide-y">
      {articles.map((article) => (
        <li key={article.id}>
          <Link
            to="/help/articles/$helpArticleSlug"
            params={{ helpArticleSlug: article.slug }}
            className="group/row hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring/50 flex items-center gap-4 px-(--card-spacing) py-3.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              {detail === 'category' ? (
                <span
                  className="text-muted-foreground text-xs font-medium"
                  dir="auto"
                >
                  {article.category.title}
                </span>
              ) : null}
              <span className="text-base font-medium" dir="auto">
                {article.title}
              </span>
              {detail !== 'title' && article.summary ? (
                <span
                  className="text-muted-foreground line-clamp-2 text-sm"
                  dir="auto"
                >
                  {article.summary}
                </span>
              ) : null}
            </span>
            <ChevronRight
              aria-hidden
              className="text-muted-foreground size-4 shrink-0 transition-transform group-hover/row:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover/row:-translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "Still need help?" with the board's contact route; nothing without one. */
function HelpContactPrompt({
  contact,
}: {
  contact: BoardContact | null | undefined;
}) {
  if (!canContactBoard(contact)) return null;
  return (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>{m.help_contactTitle()}</ItemTitle>
        <ItemDescription>{m.help_contactDescription()}</ItemDescription>
      </ItemContent>
      {/* Under the text on a phone, where the two do not fit side by side. */}
      <ItemActions className="max-sm:basis-full">
        <BoardContactButton contact={contact} />
      </ItemActions>
    </Item>
  );
}

/** The last row of a card that shows part of a category: on to the rest. */
function HelpViewAllLink({ categorySlug }: { categorySlug: string }) {
  return (
    <Link
      to="/help/categories/$helpCategorySlug"
      params={{ helpCategorySlug: categorySlug }}
      className="border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:ring-ring/50 flex items-center gap-1.5 border-t px-(--card-spacing) py-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset"
    >
      {m.help_viewAllLabel()}
      <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
    </Link>
  );
}

/** One category on the help home: what it covers and its first articles. */
function HelpCategoryCard({
  group: { category, articles },
  hasMoreArticles,
}: {
  group: HelpCategoryGroup;
  hasMoreArticles: boolean;
}) {
  const preview = articles.slice(0, HOME_PREVIEW_LIMIT);
  // The card shows only part of the category, or the home did not load all
  // of the board's articles and cannot tell.
  const showViewAll = hasMoreArticles || articles.length > preview.length;
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="py-(--card-spacing)">
        <div className="flex items-start gap-3">
          <HelpCategoryIcon icon={category.icon} />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold">
              <Link
                to="/help/categories/$helpCategorySlug"
                params={{ helpCategorySlug: category.slug }}
                className={`${focusRing} hover:underline`}
                dir="auto"
              >
                {category.title}
              </Link>
            </h2>
            {category.description ? (
              <CardDescription dir="auto">
                {category.description}
              </CardDescription>
            ) : null}
          </div>
        </div>
        {hasMoreArticles ? null : (
          <CardAction className="text-muted-foreground text-sm">
            {articleCountLabel(articles.length)}
          </CardAction>
        )}
      </CardHeader>
      {preview.length > 0 ? (
        <div className="border-border border-t">
          <HelpArticleRows
            articles={preview}
            label={m.helpCategory_articlesLabel({ category: category.title })}
          />
        </div>
      ) : null}
      {showViewAll ? <HelpViewAllLink categorySlug={category.slug} /> : null}
    </Card>
  );
}

export interface HelpSearchResults {
  /** What the visitor searched for, as the page shows it back. */
  query: string;
  /** The matching articles, best first. */
  results: PublicHelpArticleSummary[];
}

export interface HelpHomePageProps {
  groups: HelpCategoryGroup[];
  /**
   * The home read one page of articles and more exist. The home then cannot
   * count a category, so it shows no counts and every category links to its
   * own page for the rest.
   */
  hasMoreArticles: boolean;
  /**
   * A search from the header's field (`/help?q=…`). Its results replace the
   * categories.
   */
  search?: HelpSearchResults | null;
  /** How to reach the board, for "Still need help?". */
  contact?: BoardContact | null;
}

/**
 * The help home: each category with its first articles, or the results of a
 * search. The search field itself is the header's, on every help page.
 */
export function HelpHomePage({
  groups,
  hasMoreArticles,
  search,
  contact,
}: HelpHomePageProps) {
  const resultsHeadingId = useId();
  const results = search?.results;
  // A category the home knows to be empty has nothing to open.
  const shownGroups = hasMoreArticles
    ? groups
    : groups.filter((group) => group.articles.length > 0);

  return (
    <Page width="content">
      <PageContent
        header={
          <PageHeader
            title={m.help_heroHeadline()}
            description={m.help_subtitleText()}
          />
        }
      >
        {search && results ? (
          <section
            aria-labelledby={resultsHeadingId}
            className="flex flex-col gap-6"
          >
            <h2
              id={resultsHeadingId}
              className="font-heading text-xl font-semibold"
            >
              {results.length > 0
                ? m.help_searchResultsHeading({
                    count: results.length,
                    countLabel: new Intl.NumberFormat(getLocale()).format(
                      results.length,
                    ),
                    query: search.query,
                  })
                : m.help_searchEmptyTitle({ query: search.query })}
            </h2>
            {results.length > 0 ? (
              <Card className="gap-0 py-0">
                <HelpArticleRows articles={results} detail="category" />
              </Card>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search aria-hidden />
                  </EmptyMedia>
                  <EmptyDescription>
                    {m.help_searchEmptyDescription()}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Link
                    to="/help"
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    {m.help_searchResetLabel()}
                  </Link>
                </EmptyContent>
              </Empty>
            )}
          </section>
        ) : (
          <ul className="flex flex-col gap-6">
            {shownGroups.map((group) => (
              <li key={group.category.id}>
                <HelpCategoryCard
                  group={group}
                  hasMoreArticles={hasMoreArticles}
                />
              </li>
            ))}
          </ul>
        )}
        <HelpContactPrompt contact={contact} />
      </PageContent>
    </Page>
  );
}

export interface HelpCategoryPageProps {
  category: PublicHelpCategory;
  articles: PublicHelpArticleSummary[];
  /**
   * How many articles the category holds, when this page shows all of them;
   * absent on a page of a longer list, which cannot count it.
   */
  articleCount?: number;
  /** Label of the article list for assistive technology. */
  listLabel: string;
  /** Route-owned Previous/Next cursor pagination. */
  pagination?: ReactNode;
}

/** One category: its title, description and articles. */
export function HelpCategoryPage({
  category,
  articles,
  articleCount,
  listLabel,
  pagination,
}: HelpCategoryPageProps) {
  return (
    <Page width="content">
      <PageContent
        header={
          <PageHeader
            title={<span dir="auto">{category.title}</span>}
            description={
              category.description ? (
                <span dir="auto">{category.description}</span>
              ) : undefined
            }
          >
            {articleCount === undefined ? null : (
              <p className="text-muted-foreground text-sm">
                {articleCountLabel(articleCount)}
              </p>
            )}
          </PageHeader>
        }
      >
        {articles.length > 0 ? (
          <PageSection ariaLabel={listLabel}>
            <Card className="gap-0 py-0">
              <HelpArticleRows articles={articles} detail="summary" />
            </Card>
          </PageSection>
        ) : null}
        {pagination}
      </PageContent>
    </Page>
  );
}

export interface HelpArticlePageProps {
  article: PublicHelpArticle;
  /**
   * Other articles of the same category, in the board's order. `hasMore`
   * when the category holds more than these.
   */
  moreInCategory?: {
    articles: PublicHelpArticleSummary[];
    hasMore: boolean;
  } | null;
  /** "Updated 12 March 2026", already formatted for the viewer's locale. */
  updatedLabel: string | null;
  /** How to reach the board, for "Still need help?". */
  contact?: BoardContact | null;
}

/**
 * One article: where it sits, its title, summary and last update, then the
 * body on the reading column, with its sections listed beside it and the
 * category's other articles after it. The body
 * is `article.html`, which the Board API sanitized; `Prose` renders it and
 * no other string is rendered as HTML here.
 */
export function HelpArticlePage({
  article,
  moreInCategory,
  updatedLabel,
  contact,
}: HelpArticlePageProps) {
  const moreTitleId = useId();
  const headings = extractToc(article.html);
  const bodyHtml = withHeadingAnchors(article.html);
  const hasToc = headings.length >= 2;

  return (
    <Page width="wide">
      <PageContent
        header={
          // On the reading column, so the title lines up with the body.
          <div className="mx-auto w-full max-w-3xl">
            <PageHeader
              title={<span dir="auto">{article.title}</span>}
              description={
                article.summary ? (
                  <span dir="auto">{article.summary}</span>
                ) : undefined
              }
            >
              {updatedLabel ? (
                <p className="text-muted-foreground text-sm">{updatedLabel}</p>
              ) : null}
            </PageHeader>
          </div>
        }
      >
        {/* The reading column stays centred under the title; from xl the
            section list rides the margin beside it. */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(0,48rem)_1fr]">
          <article className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-10 xl:col-start-2">
            {hasToc ? (
              <ArticleToc
                headings={headings}
                className="bg-muted rounded-3xl p-5 xl:hidden"
              />
            ) : null}
            {bodyHtml ? <Prose html={bodyHtml} /> : null}
            <footer className="border-border flex flex-col gap-6 border-t pt-8">
              {moreInCategory && moreInCategory.articles.length > 0 ? (
                <section
                  aria-labelledby={moreTitleId}
                  className="flex flex-col gap-3"
                >
                  <h2
                    id={moreTitleId}
                    className="font-heading text-lg font-semibold"
                    dir="auto"
                  >
                    {m.helpArticle_moreInCategoryTitle({
                      category: article.category.title,
                    })}
                  </h2>
                  <Card className="gap-0 py-0">
                    <HelpArticleRows articles={moreInCategory.articles} />
                    {moreInCategory.hasMore ? (
                      <HelpViewAllLink categorySlug={article.category.slug} />
                    ) : null}
                  </Card>
                </section>
              ) : (
                <Link
                  to="/help/categories/$helpCategorySlug"
                  params={{ helpCategorySlug: article.category.slug }}
                  className={`${buttonVariants({ variant: 'outline' })} self-start`}
                >
                  <ArrowLeft
                    aria-hidden
                    data-icon="inline-start"
                    className="rtl:rotate-180"
                  />
                  <span dir="auto">
                    {m.helpCategory_articlesLabel({
                      category: article.category.title,
                    })}
                  </span>
                </Link>
              )}
              <HelpContactPrompt contact={contact} />
            </footer>
          </article>
          {hasToc ? (
            <aside className="hidden ps-10 xl:col-start-3 xl:block">
              <ArticleToc
                headings={headings}
                className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
              />
            </aside>
          ) : null}
        </div>
      </PageContent>
    </Page>
  );
}

export interface HelpNotFoundProps {
  title: string;
  description: string;
  /** Where the visitor can go instead; absent when the help home is the 404. */
  action?: { label: string; href: '/help' | '/' };
}

/** The 404 of the three help pages. */
export function HelpNotFound({
  title,
  description,
  action,
}: HelpNotFoundProps) {
  return (
    <PageLayout>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LifeBuoy aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        {action ? (
          <EmptyContent>
            <Link
              to={action.href}
              className={buttonVariants({ variant: 'outline' })}
            >
              {action.label}
            </Link>
          </EmptyContent>
        ) : null}
      </Empty>
    </PageLayout>
  );
}
