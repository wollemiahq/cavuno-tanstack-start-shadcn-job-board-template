'use client';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import { catalogJobCount, visiblePageSpan } from '@/board/job-catalog-count';
import { jobSearchCopy } from '@/copy-groups/job-search';
import { entityCount } from '@/lib/entity-count';
import type { CountedHeading } from '@/lib/listing-description';
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
  const pageableCount = finiteNumber(visibleCount);
  const totalCount = catalogJobCount(pageableCount, gatedCount);
  const currentPage = finiteNumber(page);
  const currentPageSize = finiteNumber(pageSize);
  const span =
    pageableCount !== undefined &&
    currentPage !== undefined &&
    currentPageSize !== undefined
      ? visiblePageSpan(currentPage, currentPageSize, pageableCount)
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
