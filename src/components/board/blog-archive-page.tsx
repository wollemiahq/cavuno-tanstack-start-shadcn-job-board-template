import type { ReactNode } from 'react';

import { FileText } from 'lucide-react';

import { m } from '../../paraglide/messages';

import type { BreadcrumbData } from '@/components/board/breadcrumb';
import { PageHeaderWithBreadcrumb } from '@/components/board/page-header-with-breadcrumb';
import { Page, PageContent, PageSection } from '@/components/layout/page';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import type { PublicBlogPostSummary } from '@cavuno/board';

export interface BlogArchiveEmptyState {
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export interface BlogArchivePageProps {
  breadcrumb: BreadcrumbData;
  title: string;
  description?: string | null;
  avatar?: ReactNode;
  filters?: ReactNode;
  search?: ReactNode;
  posts: PublicBlogPostSummary[];
  empty: BlogArchiveEmptyState;
  /** Route-owned because blog cursors are opaque and router-specific. */
  nextLink?: ReactNode;
}

/** Shared Page-family presentation for the blog, tag, and author archives. */
export function BlogArchivePage({
  breadcrumb,
  title,
  description,
  avatar,
  filters,
  search,
  posts,
  empty,
  nextLink,
}: BlogArchivePageProps) {
  return (
    <Page>
      <PageContent
        header={
          <PageHeaderWithBreadcrumb
            breadcrumb={breadcrumb}
            title={title}
            description={description}
            eyebrow={avatar}
          >
            {search}
          </PageHeaderWithBreadcrumb>
        }
      >
        {filters}

        <PageSection ariaLabel={title}>
          {posts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
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
                    href={empty.action.href}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    {empty.action.label}
                  </a>
                </EmptyContent>
              ) : null}
            </Empty>
          )}
        </PageSection>

        {posts.length > 0 && nextLink ? (
          <Pagination aria-label={m.pagination_ariaLabel()}>
            <PaginationContent>
              <PaginationItem>{nextLink}</PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </PageContent>
    </Page>
  );
}
