import type { ReactNode } from 'react';

import { AlertCircle } from 'lucide-react';

import { SearchDetailHeader } from '@/components/board/search-detail-header';
import { SearchResultDetailHeader } from '@/components/search-results/search-results';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

export type CompanySearchDetailStateProps = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  detail?: ReactNode;
  loadingLabel: string;
  errorTitle: string;
  retryLabel: string;
  onRetry: () => void;
};

function CompanyDetailLoadingHeader({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    return (
      <SearchDetailHeader
        mark={<Skeleton className="size-10 rounded-full" />}
        name={<Skeleton className="h-5 w-40" />}
        actions={
          <>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-28" />
          </>
        }
      />
    );
  }

  return (
    <div
      data-slot="company-detail-loading-expanded-header"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-4 p-5 md:p-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="min-w-0 space-y-1">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="col-start-1 row-start-2 flex items-center gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

function CompanyDetailLoadingSkeleton({
  loadingLabel,
}: {
  loadingLabel: string;
}) {
  return (
    <article role="status" aria-busy="true" className="max-w-full min-w-0">
      <span className="sr-only">{loadingLabel}</span>
      <SearchResultDetailHeader
        expanded={<CompanyDetailLoadingHeader />}
        compact={<CompanyDetailLoadingHeader compact />}
      />
      <div
        data-slot="company-detail-loading-body"
        className="max-w-full min-w-0 space-y-8 p-5 md:p-6"
      >
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-3/4" />
        </div>

        <section className="space-y-3" aria-hidden="true">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="border-border space-y-3 rounded-xl border p-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3" aria-hidden="true">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
          <div className="border-border space-y-3 rounded-xl border p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </section>
      </div>
    </article>
  );
}

export function CompanySearchDetailState({
  status,
  detail,
  loadingLabel,
  errorTitle,
  retryLabel,
  onRetry,
}: CompanySearchDetailStateProps) {
  if (status === 'idle') return null;
  if (status === 'ready') return detail ?? null;

  if (status === 'loading') {
    return <CompanyDetailLoadingSkeleton loadingLabel={loadingLabel} />;
  }

  if (status === 'error' && !detail) {
    return (
      <Empty role="alert" className="min-h-(--detail-pane-min-h)">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircle aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{errorTitle}</EmptyTitle>
          <EmptyDescription>{retryLabel}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (status === 'error' && detail) {
    return (
      <div>
        <Alert
          variant="destructive"
          className="rounded-none border-x-0 border-t-0 px-5 py-3"
        >
          <AlertDescription>{errorTitle}</AlertDescription>
          <AlertAction>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          </AlertAction>
        </Alert>
        {detail}
      </div>
    );
  }

  return null;
}
