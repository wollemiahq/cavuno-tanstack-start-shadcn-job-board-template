import type { ReactNode } from 'react';

import { AlertCircle } from 'lucide-react';

import { TalentSearchResultDetailSkeleton } from '@/components/board/talent-search-result-detail';
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

export type TalentSearchDetailStateProps = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  detail?: ReactNode;
  loadingLabel: string;
  errorTitle: string;
  retryLabel: string;
  onRetry: () => void;
};

export function TalentSearchDetailState({
  status,
  detail,
  loadingLabel,
  errorTitle,
  retryLabel,
  onRetry,
}: TalentSearchDetailStateProps) {
  if (status === 'idle') return null;
  if (status === 'ready') return detail ?? null;

  if (status === 'loading') {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{loadingLabel}</span>
        <TalentSearchResultDetailSkeleton />
      </div>
    );
  }

  if (status === 'error' && !detail) {
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
