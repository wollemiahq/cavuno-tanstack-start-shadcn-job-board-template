import type { ReactNode } from 'react';

import { FileText } from 'lucide-react';

import type { BreadcrumbData } from '@/components/board/breadcrumb';
import {
  Page,
  PageContent,
  PageHeader,
  PageSection,
} from '@/components/layout/page';
import { PostCard } from '@/components/post-card';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { localizePath } from '@/lib/localized-path';
import type { PublicBlogPostSummary } from '@cavuno/board';

export interface BlogArchiveEmptyState {
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export interface BlogArchivePageProps {
  breadcrumb?: BreadcrumbData;
  title: string;
  /** Bio, location + bio, or other archive intro under the title. */
  description?: ReactNode;
  /**
   * Optional decorative mark that leads the h1 inline (e.g. an author
   * avatar), so the heading keeps the same baseline as the other archives
   * instead of being pushed down by an eyebrow row.
   */
  avatar?: ReactNode;
  filters?: ReactNode;
  search?: ReactNode;
  posts: PublicBlogPostSummary[];
  empty: BlogArchiveEmptyState;
  /**
   * Route-owned Previous/Next cursor pagination (the blog SDK surface is
   * cursor-only — no total count, no offset — so numbered pages are impossible);
   * built with the shared `CursorPagination` on the design-system primitives.
   */
  pagination?: ReactNode;
}

/** Shared Page-family presentation for the blog, tag, and author archives. */
export function BlogArchivePage({
  title,
  description,
  avatar,
  filters,
  search,
  posts,
  empty,
  pagination,
}: BlogArchivePageProps) {
  const heading = avatar ? (
    <span className="flex items-center gap-3">
      {avatar}
      <span className="min-w-0">{title}</span>
    </span>
  ) : (
    title
  );
  // First cover is the archive LCP candidate (PageSpeed: LCP request discovery).
  const lcpPostId = posts.find((entry) => entry.coverUrl)?.id ?? null;

  return (
    <Page>
      <PageContent
        header={
          <PageHeader title={heading} description={description}>
            {search}
            {filters}
          </PageHeader>
        }
      >
        <PageSection ariaLabel={title}>
          {posts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  priority={post.id === lcpPostId}
                />
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText aria-hidden />
                </EmptyMedia>
                <EmptyTitle>{empty.title}</EmptyTitle>
                <EmptyDescription>{empty.description}</EmptyDescription>
              </EmptyHeader>
              {empty.action ? (
                <EmptyContent>
                  <a
                    href={localizePath(empty.action.href)}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    {empty.action.label}
                  </a>
                </EmptyContent>
              ) : null}
            </Empty>
          )}
        </PageSection>

        {posts.length > 0 ? pagination : null}
      </PageContent>
    </Page>
  );
}
