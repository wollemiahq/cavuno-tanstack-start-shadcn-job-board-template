import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';

import { m } from '../paraglide/messages';

import { ClientErrorReporter } from '@/components/client-error-reporting-boot';
import { Page, PageContent } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

export function CandidateRoutePending({
  label,
  withRail = false,
}: {
  label: string;
  /** The /account profile page loads into a wide body + completeness rail. */
  withRail?: boolean;
}) {
  if (withRail) {
    return (
      <Page width="wide">
        <PageContent
          aside={<Skeleton className="h-96 rounded-3xl" />}
          asideLabel={label}
        >
          <div
            role="status"
            aria-label={label}
            aria-busy="true"
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-8 w-1/3" />
            </div>
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </div>
        </PageContent>
      </Page>
    );
  }

  return (
    <Page width="content">
      <PageContent>
        <div
          role="status"
          aria-label={label}
          aria-busy="true"
          className="space-y-6"
        >
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
            <h1 className="font-heading text-lg font-medium tracking-tight">
              {title}
            </h1>
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

/** Pending state matching the /account profile layout (cards + right rail). */
export function CandidateProfilePendingPage() {
  return (
    <CandidateRoutePending label={m.candidateAccount_loadingLabel()} withRail />
  );
}

export function CandidateRouteErrorPage({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <>
      <ClientErrorReporter error={error} />
      <CandidateRouteError
        title={m.candidateAccount_errorTitle()}
        description={m.candidateAccount_errorBody()}
        retryLabel={m.candidateAccount_retryLabel()}
        navigationLabel={m.accountShell_candidateNavigationLabel()}
        // TanStack's `reset` only clears the boundary and the errored match
        // rethrows at once; invalidating re-runs the loader.
        reset={() => void router.invalidate()}
      />
    </>
  );
}
