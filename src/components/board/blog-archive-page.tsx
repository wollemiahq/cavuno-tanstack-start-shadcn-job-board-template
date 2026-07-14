import type { ReactNode } from "react";
import { FileText } from "lucide-react";

import type { PublicBlogPostSummary } from "@cavuno/board";

import type { BreadcrumbData } from "@/components/board/breadcrumb";
import { PageHeaderWithBreadcrumb } from "@/components/board/page-header-with-breadcrumb";
import { Page, PageContent, PageSection } from "@/components/layout/page";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PostCard } from "@/components/post-card";

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
                  <a href={empty.action.href} className={buttonVariants({ variant: "outline" })}>
                    {empty.action.label}
                  </a>
                </EmptyContent>
              ) : null}
            </Empty>
          )}
        </PageSection>

        {posts.length > 0 && nextLink ? (
          <div className="flex justify-center [&_a]:rounded-2xl [&_a]:border [&_a]:border-border [&_a]:bg-background [&_a]:px-4 [&_a]:py-2 [&_a]:text-sm [&_a]:font-medium [&_a]:outline-none [&_a]:hover:bg-muted [&_a]:focus-visible:ring-3 [&_a]:focus-visible:ring-ring/30">
            {nextLink}
          </div>
        ) : null}
      </PageContent>
    </Page>
  );
}
