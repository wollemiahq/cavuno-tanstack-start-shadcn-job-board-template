import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

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

export type CompanySearchDetailStateProps = {
  status: "idle" | "loading" | "ready" | "error";
  detail?: ReactNode;
  loadingLabel: string;
  errorTitle: string;
  retryLabel: string;
  onRetry: () => void;
};

export function CompanySearchDetailState({
  status,
  detail,
  loadingLabel,
  errorTitle,
  retryLabel,
  onRetry,
}: CompanySearchDetailStateProps) {
  if (status === "idle") return null;
  if (status === "ready") return detail ?? null;

  if (status === "error" && !detail) {
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

  if (status === "error" && detail) {
    return (
      <div>
        <div
          role="alert"
          className="flex items-center justify-between gap-4 border-b border-destructive/30 bg-destructive/5 px-5 py-3 text-sm"
        >
          <span>{errorTitle}</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
        {detail}
      </div>
    );
  }

  if (status === "loading" && detail) {
    return (
      <div aria-busy="true">
        <p role="status" className="sr-only">
          {loadingLabel}
        </p>
        {detail}
      </div>
    );
  }

  return (
    <div role="status" aria-busy="true" className="min-h-[28rem] space-y-6 p-6">
      <span className="sr-only">{loadingLabel}</span>
      <div className="flex items-center gap-3">
        <Skeleton className="size-12" />
        <Skeleton className="h-6 w-40" />
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
