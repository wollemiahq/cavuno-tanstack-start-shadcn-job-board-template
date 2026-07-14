import type { ErrorComponentProps } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";

import { Page, PageContent } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "../paraglide/messages";

export function CandidateRoutePending({ label }: { label: string }) {
  return (
    <Page width="wide">
      <PageContent
        aside={<Skeleton className="h-72 rounded-3xl" />}
        asideLabel={label}
        asideOrder="before"
      >
        <div role="status" aria-label={label} aria-busy="true" className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </PageContent>
    </Page>
  );
}

export function CandidateRouteError({
  title,
  description,
  retryLabel,
  navigationLabel,
  reset,
}: {
  title: string;
  description: string;
  retryLabel: string;
  navigationLabel: string;
  reset: () => void;
}) {
  return (
    <Page width="wide">
      <PageContent
        aside={<Skeleton className="h-72 rounded-3xl" />}
        asideLabel={navigationLabel}
        asideOrder="before"
      >
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlert />
            </EmptyMedia>
            <h1 className="font-heading text-lg font-medium tracking-tight">{title}</h1>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={reset}>
              {retryLabel}
            </Button>
          </EmptyContent>
        </Empty>
      </PageContent>
    </Page>
  );
}

export function CandidateRoutePendingPage() {
  return <CandidateRoutePending label={m.candidateAccount_loadingLabel()} />;
}

export function CandidateRouteErrorPage({ reset }: ErrorComponentProps) {
  return (
    <CandidateRouteError
      title={m.candidateAccount_errorTitle()}
      description={m.candidateAccount_errorBody()}
      retryLabel={m.candidateAccount_retryLabel()}
      navigationLabel={m.accountShell_candidateNavigationLabel()}
      reset={reset}
    />
  );
}
