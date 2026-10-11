'use client';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import { catalogJobCount, visiblePageSpan } from '@/board/job-catalog-count';
import { jobSearchCopy } from '@/copy-groups/job-search';
import { entityCount } from '@/lib/entity-count';
import type { CountedHeading } from '@/lib/listing-description';
import { isLastReachablePage, pageableCount } from '@/lib/pagination';
import { resultsShowingLine, type ResultsSpan } from '@/lib/results-showing';
import { chromeEntity } from '@/lib/site-chrome';
import { cn } from '@/lib/utils';

/** The page's place in the results: 1–20 of 93; all `0` when empty. */
export type ResultsRange = { from: number; to: number; count: number };

function finiteNumber(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return value;
}

/** The honest result count and current page range directly above the cards. */
export function JobsResultsBar({
  visibleCount,
  gatedCount,
  reachableCount,
  page,
  pageSize,
  heading,
  countedHeading,
  language,
  scope,
  className,
}: {
  visibleCount?: number;
  gatedCount?: number;
  /** Deepest result the search can page to; bounds the range, not the total. */
  reachableCount?: number;
  /** Current 1-based page + page size — renders the honest "Showing X–Y of Z" range. */
  page?: number;
  pageSize?: number;
  /** Route context, such as “Engineering jobs” or “Jobs in Sydney”. */
  heading?: string;
  /** `heading` with the count, inflected for it (“1 Ansible job”). */
  countedHeading?: CountedHeading;
  language: string;
  /**
   * A results line that says what the results cover (such as the location
   * search distance), in place of the "Showing X–Y of Z" range. Gets the
   * range, or `null` when the count is unknown.
   */
  scope?: (range: ResultsRange | null) => React.ReactNode;
  className?: string;
}) {
  // Viewer chrome locale for number/plural formatting (prop kept for call-site
  // compatibility; prefer getLocale() so a stale prop cannot drift).
  const locale = language || getLocale();
  const visible = finiteNumber(visibleCount);
  const totalCount = catalogJobCount(visible, gatedCount);
  const currentPage = finiteNumber(page);
  const currentPageSize = finiteNumber(pageSize);
  const span =
    visible !== undefined &&
    currentPage !== undefined &&
    currentPageSize !== undefined
      ? visiblePageSpan(
          currentPage,
          currentPageSize,
          pageableCount(visible, reachableCount),
        )
      : null;
  const totalLabel =
    totalCount !== undefined
      ? countedHeading
        ? countedHeading({
            count: totalCount,
            countLabel: totalCount.toLocaleString(locale),
          })
        : heading
          ? m.jobSearch_contextualResultsHeading({
              count: totalCount.toLocaleString(locale),
              heading,
            })
          : entityCount(totalCount, locale, m.count_jobs, {
              singular: chromeEntity().jobSingular,
              plural: chromeEntity().jobPlural,
            })
      : (heading ?? jobSearchCopy().headingJobs);
  const range: ResultsRange | null =
    totalCount === undefined
      ? null
      : {
          from: span?.from ?? 0,
          to: span?.to ?? 0,
          count: span ? totalCount : 0,
        };
  const rangeLabel =
    span && totalCount !== undefined
      ? jobsResultsShowingLine(
          { from: span.from, to: span.to, count: totalCount },
          locale,
        )
      : null;

  return (
    <div
      data-slot="jobs-results-bar"
      className={cn('flex items-center justify-between gap-3 pb-3', className)}
    >
      <div className="min-w-0">
        <h1 className="text-foreground text-lg font-semibold tracking-tight">
          {totalLabel}
        </h1>
        {scope ? (
          scope(range)
        ) : rangeLabel ? (
          <p className="text-muted-foreground text-xs">{rangeLabel}</p>
        ) : null}
      </div>
    </div>
  );
}

/** The "Showing …" line under a jobs results heading. */
export function jobsResultsShowingLine(
  span: ResultsSpan,
  locale: string,
): string {
  return resultsShowingLine(span, locale, {
    single: ({ count, countLabel }) =>
      m.jobSearch_resultsShowingCount({ count, countLabel }),
    lastPage: ({ to, count, countLabel }) =>
      m.jobSearch_resultsShowingLast({ to, count, countLabel }),
    range: ({ from, to, count, countLabel }) =>
      m.jobSearch_resultsShowingRange({ from, to, count, countLabel }),
  });
}

/**
 * Under the last reachable page of a search whose matches run past its
 * reachable depth (`reachableCount` below `count`): the API serves no results
 * past this page, so name the matches shown and point the reader at narrowing
 * the search. Renders nothing on any other page or listing.
 */
export function JobsCappedResultsHint({
  count,
  reachableCount,
  page,
  pageSize,
  rows,
  language,
}: {
  count?: number;
  reachableCount?: number;
  page: number;
  pageSize: number;
  /** Results on this page. */
  rows: number;
  language: string;
}) {
  const total = finiteNumber(count);
  if (
    total === undefined ||
    !(rows > 0) ||
    !isLastReachablePage(page, pageSize, total, reachableCount)
  ) {
    return null;
  }
  const offset = (page - 1) * pageSize;
  const locale = language || getLocale();
  return (
    <p
      data-slot="jobs-capped-results-hint"
      className="text-muted-foreground text-sm"
    >
      {m.jobSearch_cappedResultsHint({
        from: (offset + 1).toLocaleString(locale),
        to: (offset + rows).toLocaleString(locale),
      })}
    </p>
  );
}
