import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { ChevronRight, LifeBuoy } from 'lucide-react';

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
import type {
  PublicHelpArticle,
  PublicHelpArticleSummary,
  PublicHelpCategory,
} from '@cavuno/board';

export interface HelpCategoryGroup {
  category: PublicHelpCategory;
  articles: PublicHelpArticleSummary[];
}

/** One article per row, in the order the API returned them. */
function HelpArticleList({
  articles,
}: {
  articles: PublicHelpArticleSummary[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {articles.map((article) => (
        <li key={article.id}>
          <Item
            variant="outline"
            render={
              <Link
                to="/help/articles/$helpArticleSlug"
                params={{ helpArticleSlug: article.slug }}
              />
            }
          >
            <ItemContent>
              <ItemTitle dir="auto">{article.title}</ItemTitle>
              {article.summary ? (
                <ItemDescription dir="auto">{article.summary}</ItemDescription>
              ) : null}
            </ItemContent>
            <ItemActions>
              <ChevronRight
                aria-hidden
                className="text-muted-foreground size-4 rtl:rotate-180"
              />
            </ItemActions>
          </Item>
        </li>
      ))}
    </ul>
  );
}

export interface HelpHomePageProps {
  title: string;
  description: string;
  groups: HelpCategoryGroup[];
  /**
   * The home read one page of articles and more exist, so every category
   * links to its own page for the rest.
   */
  hasMoreArticles: boolean;
  viewAllLabel: string;
}

/** The help home: each category with its articles under it. */
export function HelpHomePage({
  title,
  description,
  groups,
  hasMoreArticles,
  viewAllLabel,
}: HelpHomePageProps) {
  return (
    <Page width="content">
      <PageContent
        header={<PageHeader title={title} description={description} />}
      >
        {groups.map(({ category, articles }) => (
          <PageSection
            key={category.id}
            title={
              <Link
                to="/help/categories/$helpCategorySlug"
                params={{ helpCategorySlug: category.slug }}
                className="focus-visible:ring-ring/30 rounded-sm outline-none hover:underline focus-visible:ring-3"
                dir="auto"
              >
                {category.title}
              </Link>
            }
            description={
              category.description ? (
                <span dir="auto">{category.description}</span>
              ) : undefined
            }
          >
            {articles.length > 0 ? (
              <HelpArticleList articles={articles} />
            ) : null}
            {hasMoreArticles ? (
              <Link
                to="/help/categories/$helpCategorySlug"
                params={{ helpCategorySlug: category.slug }}
                className={buttonVariants({ variant: 'outline' })}
              >
                {viewAllLabel}
              </Link>
            ) : null}
          </PageSection>
        ))}
      </PageContent>
    </Page>
  );
}

export interface HelpCategoryPageProps {
  category: PublicHelpCategory;
  articles: PublicHelpArticleSummary[];
  /** Label of the article list for assistive technology. */
  listLabel: string;
  /** Route-owned Previous/Next cursor pagination. */
  pagination?: ReactNode;
}

/** One category: its title, description and articles. */
export function HelpCategoryPage({
  category,
  articles,
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
          />
        }
      >
        <PageSection ariaLabel={listLabel}>
          <HelpArticleList articles={articles} />
        </PageSection>
        {pagination}
      </PageContent>
    </Page>
  );
}

export interface HelpArticlePageProps {
  article: PublicHelpArticle;
  /** "Updated 12 March 2026", already formatted for the viewer's locale. */
  updatedLabel: string | null;
}

/**
 * One article: its category, title and last update, then the body. The body
 * is `article.html`, which the Board API sanitized; `Prose` renders it and
 * no other string is rendered as HTML here.
 */
export function HelpArticlePage({
  article,
  updatedLabel,
}: HelpArticlePageProps) {
  return (
    <PageLayout>
      {/* The readable measure the legal pages and blog articles use. */}
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            <Link
              to="/help/categories/$helpCategorySlug"
              params={{ helpCategorySlug: article.category.slug }}
              className="focus-visible:ring-ring/30 rounded-sm outline-none hover:underline focus-visible:ring-3"
              dir="auto"
            >
              {article.category.title}
            </Link>
          </p>
          <h1
            className="font-heading text-3xl font-semibold tracking-tight"
            dir="auto"
          >
            {article.title}
          </h1>
          {updatedLabel ? (
            <p className="text-muted-foreground text-sm">{updatedLabel}</p>
          ) : null}
        </header>
        {article.html ? <Prose html={article.html} /> : null}
      </article>
    </PageLayout>
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
