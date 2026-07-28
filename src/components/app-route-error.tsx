'use client';

import { useEffect, useState } from 'react';

import { isRateLimited } from '@cavuno/board';
import { Link } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';

import { serializeDataSourceCookie } from '../lib/data-source';
import { m } from '../paraglide/messages';
import { getDataSourceFacts } from '../server/preview';

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
 *
 * Dual-source sticky-demo: when the active data source is a dead demo tenant,
 * retry re-hits the same dead tenant. This surface probes
 * `getDataSourceFacts` (env+cookie only — works when the demo API is down)
 * and offers "Switch back to your board" when dual-source is on demo.
 */
export function AppRouteError({
  title,
  description,
  retryLabel,
  homeLabel,
  reset,
  switchToYourBoard,
}: {
  title: string;
  description: string;
  retryLabel: string;
  homeLabel: string;
  reset: () => void;
  /** Dual-source escape hatch — only when stuck on a dead demo tenant. */
  switchToYourBoard?: { label: string; onClick: () => void } | null;
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
            {switchToYourBoard ? (
              <Button
                type="button"
                variant="secondary"
                onClick={switchToYourBoard.onClick}
              >
                {switchToYourBoard.label}
              </Button>
            ) : null}
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

  // Dual-source escape hatch. Facts come from env+cookie only (no board API),
  // so this still resolves when the demo tenant is the thing that is down.
  // Failure is swallowed — the page stays a plain retry/home error.
  const [stuckOnDemo, setStuckOnDemo] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getDataSourceFacts()
      .then((facts) => {
        if (!cancelled && facts.demoConfigured && facts.dataSource === 'demo') {
          setStuckOnDemo(true);
        }
      })
      .catch(() => {
        // No action — prefer a plain error surface over a broken one.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onSwitchToYourBoard() {
    document.cookie = serializeDataSourceCookie('board');
    window.location.reload();
  }

  return (
    <AppRouteError
      title={m.appError_heading()}
      description={
        rateLimited ? m.appError_rateLimitedBody() : m.appError_body()
      }
      retryLabel={m.appError_retryAction()}
      homeLabel={m.appError_homeLink()}
      reset={reset}
      switchToYourBoard={
        stuckOnDemo
          ? {
              label: m.appError_switchToYourBoard(),
              onClick: onSwitchToYourBoard,
            }
          : null
      }
    />
  );
}
