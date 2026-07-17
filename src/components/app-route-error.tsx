'use client';

import { isRateLimited } from '@cavuno/board';
import { Link } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';

import { m } from '../paraglide/messages';

import { Page } from '@/components/layout/page';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import type { ErrorComponentProps } from '@tanstack/react-router';

/**
 * The public-facing route error state — the root route's backstop for a
 * loader rejection anywhere in the tree (a Board API 500/timeout, a failed
 * `serverFnFetcher`). Without it TanStack has no error boundary above the
 * six candidate routes, so a rejecting public loader left the page blank.
 *
 * Two constraints shape this surface:
 *  - It stands in for `RootLayout`, so it renders its own `<main>` and its
 *    own `Page` (which owns the design-token scope) — the header/footer chrome
 *    is NOT mounted around it.
 *  - It reads NO loader data. The root loader is one of the things that can
 *    fail, so board context may never have resolved; copy comes from the
 *    Paraglide seam and the recovery link is a static typed route.
 */
export function AppRouteError({
  title,
  description,
  retryLabel,
  homeLabel,
  reset,
}: {
  title: string;
  description: string;
  retryLabel: string;
  homeLabel: string;
  reset: () => void;
}) {
  return (
    <Page width="wide">
      <main data-layout="app-route-error">
        <Empty className="min-h-[calc(100dvh-8rem)] border-0 p-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlert aria-hidden="true" />
            </EmptyMedia>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              {title}
            </h1>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={reset}>
              {retryLabel}
            </Button>
            <Link to="/" className={buttonVariants({ variant: 'outline' })}>
              {homeLabel}
            </Link>
          </EmptyContent>
        </Empty>
      </main>
    </Page>
  );
}

export function AppRouteErrorPage({ error, reset }: ErrorComponentProps) {
  // The one distinction worth surfacing: rate limiting is transient and
  // waiting actually fixes it, so "try again in a moment" would mislead.
  // Server-function errors cross the wire as plain Errors, so the SDK guard
  // is backed up by a message sniff.
  const rateLimited =
    isRateLimited(error) || /rate limit/i.test(error?.message ?? '');

  return (
    <AppRouteError
      title={m.appError_heading()}
      description={
        rateLimited ? m.appError_rateLimitedBody() : m.appError_body()
      }
      retryLabel={m.appError_retryAction()}
      homeLabel={m.appError_homeLink()}
      reset={reset}
    />
  );
}
