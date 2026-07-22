import type { ReactNode } from 'react';

import { AlertCircle } from 'lucide-react';

import { JobSearchResultDetailPending } from '@/components/board/job-search-result-detail';
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

export type JobSearchDetailStateProps = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  /**
   * The prebuilt job-detail node, assembled by the route pane
   * (`-selected-job-detail`): a `JobSearchResultDetail` whose apply/save slots
   * are already made inert on error. A dumb wrapper like its company/talent
   * siblings — it owns only the idle/loading/error chrome, never the assembly.
   */
  detail?: ReactNode;
  loadingLabel: string;
  errorTitle: string;
  retryLabel: string;
  onRetry: () => void;
};

export function JobSearchDetailState({
  status,
  detail,
  loadingLabel,
  errorTitle,
  retryLabel,
  onRetry,
}: JobSearchDetailStateProps) {
  if (status === 'idle') return null;
  if (status === 'ready') return detail ?? null;

  // A transition (loading a new job over an old one, or a cold first load)
  // shows the pending skeleton and hides the previous content and actions.
  if (status === 'loading') {
    return <JobSearchResultDetailPending loadingLabel={loadingLabel} />;
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
