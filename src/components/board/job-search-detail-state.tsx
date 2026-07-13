import { AlertCircle } from "lucide-react";

import type { JobDetailVM } from "@/board/job-detail-view-model";
import { JobSearchResultDetail } from "@/components/board/job-search-result-detail";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function JobSearchDetailState({
  status,
  vm,
  loadingLabel,
  errorTitle,
  retryLabel,
  fullPageLabel,
  onRetry,
  applySlot,
  saveSlot,
}: {
  status: "idle" | "loading" | "ready" | "error";
  vm?: JobDetailVM;
  loadingLabel: string;
  errorTitle: string;
  retryLabel: string;
  fullPageLabel: string;
  onRetry: () => void;
  applySlot?: React.ReactNode;
  saveSlot?: React.ReactNode;
}) {
  if (vm?.detailHref) {
    return (
      <div aria-busy={status === "loading"}>
        {status === "error" ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 border-b border-destructive/30 bg-destructive/5 px-5 py-3 text-sm"
          >
            <span>{errorTitle}</span>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        ) : null}
        {status === "loading" ? (
          <p role="status" className="sr-only">
            {loadingLabel}
          </p>
        ) : null}
        <JobSearchResultDetail
          vm={vm}
          fullPageHref={vm.detailHref}
          fullPageLabel={fullPageLabel}
          applySlot={status === "ready" ? applySlot : undefined}
          saveSlot={status === "ready" ? saveSlot : undefined}
        />
      </div>
    );
  }

  if (status === "error") {
    return (
      <Empty className="min-h-[28rem]">
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
    <div role="status" aria-busy="true" className="min-h-[28rem] space-y-6 p-6">
      <span>{loadingLabel}</span>
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
