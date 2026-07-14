import { AlertCircle } from 'lucide-react';

import type { JobDetailVM } from '@/board/job-detail-view-model';
import { JobSearchResultDetail } from '@/components/board/job-search-result-detail';
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

export function JobSearchDetailState({
  status,
  vm,
  loadingLabel,
  errorTitle,
  retryLabel,
  onRetry,
  applySlot,
  saveSlot,
}: {
  status: 'idle' | 'loading' | 'ready' | 'error';
  vm?: JobDetailVM;
  loadingLabel: string;
  errorTitle: string;
  retryLabel: string;
  onRetry: () => void;
  applySlot?: React.ReactNode;
  saveSlot?: React.ReactNode;
}) {
  if (status === 'idle') return null;

  if (vm?.detailHref) {
    return (
      <div aria-busy={status === 'loading'}>
        {status === 'error' ? (
          <Alert
            variant="destructive"
            className="rounded-none border-x-0 border-t-0 px-5 py-3"
          >
            <AlertDescription>{errorTitle}</AlertDescription>
            <AlertAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
              >
                {retryLabel}
              </Button>
            </AlertAction>
          </Alert>
        ) : null}
        {status === 'loading' ? (
          <p role="status" className="sr-only">
            {loadingLabel}
          </p>
        ) : null}
        <JobSearchResultDetail
          vm={vm}
          loading={status === 'loading'}
          applySlot={
            status === 'error' ? (
              <span data-inert="true" inert className="contents">
                {applySlot}
              </span>
            ) : (
              applySlot
            )
          }
          saveSlot={
            status === 'error' ? (
              <span data-inert="true" inert className="contents">
                {saveSlot}
              </span>
            ) : (
              saveSlot
            )
          }
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <Empty role="alert" className="min-h-[28rem]">
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

  return (
    <div role="status" className="min-h-[28rem] space-y-6 p-6">
      <span className="sr-only">{loadingLabel}</span>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-9 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-52 w-full" />
    </div>
  );
}
