'use client';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import { displayedJobCount, visiblePageSpan } from '@/board/job-catalog-count';
import { jobSearchCopy } from '@/copy-groups/job-search';
import { entityCount } from '@/lib/entity-count';
import { jobCountLabel } from '@/lib/job-count-label';
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
  countCapped = false,
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
  /**
   * The count is the Board API's ranking limit, not the true total (see
   * `isRelevanceCountCapped`): it reads "1,000+" and ignores withheld jobs.
   */
  countCapped?: boolean;
  className?: string;
}) {
  // Viewer chrome locale for number/plural formatting (prop kept for call-site
  // compatibility; prefer getLocale() so a stale prop cannot drift).
  const locale = language || getLocale();
  const pageableCount = finiteNumber(visibleCount);
  const capped = countCapped && pageableCount !== undefined;
  const totalCount = displayedJobCount(pageableCount, gatedCount, capped);
  const totalCountLabel =
    totalCount !== undefined
      ? jobCountLabel(totalCount, locale, capped)
      : undefined;
  const currentPage = finiteNumber(page);
  const currentPageSize = finiteNumber(pageSize);
  const span =
    pageableCount !== undefined &&
    currentPage !== undefined &&
    currentPageSize !== undefined
      ? visiblePageSpan(currentPage, currentPageSize, pageableCount)
      : null;
  const totalLabel =
    totalCount !== undefined && totalCountLabel !== undefined
      ? countedHeading
        ? countedHeading({ count: totalCount, countLabel: totalCountLabel })
        : heading
          ? m.jobSearch_contextualResultsHeading({
              count: totalCountLabel,
              heading,
            })
          : entityCount(
              totalCount,
              locale,
              m.count_jobs,
              {
                singular: chromeEntity().jobSingular,
                plural: chromeEntity().jobPlural,
              },
              totalCountLabel,
            )
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
          totalCountLabel,
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
  /** The total as shown, such as "1,000+"; defaults to `count` formatted. */
  countLabel?: string,
): string {
  return resultsShowingLine(
    span,
    locale,
    {
      single: ({ count, countLabel }) =>
        m.jobSearch_resultsShowingCount({ count, countLabel }),
      lastPage: ({ to, count, countLabel }) =>
        m.jobSearch_resultsShowingLast({ to, count, countLabel }),
      range: ({ from, to, count, countLabel }) =>
        m.jobSearch_resultsShowingRange({ from, to, count, countLabel }),
    },
    countLabel,
  );
}

/**
 * Under the last page of a capped result set (see `isRelevanceCountCapped`):
 * the API serves no matches past this page, so point the reader at narrowing
 * the search instead. Renders nothing on any other page.
 */
export function JobsCappedResultsHint({
  visibleCount,
  page,
  pageSize,
  countCapped = false,
  language,
}: {
  visibleCount?: number;
  page: number;
  pageSize: number;
  countCapped?: boolean;
  language: string;
}) {
  const count = finiteNumber(visibleCount);
  if (!countCapped || count === undefined) return null;
  const span = visiblePageSpan(page, pageSize, count);
  if (!span || span.to < count) return null;
  const locale = language || getLocale();
  return (
    <p
      data-slot="jobs-capped-results-hint"
      className="text-muted-foreground text-sm"
    >
      {m.jobSearch_cappedResultsHint({
        from: span.from.toLocaleString(locale),
        to: span.to.toLocaleString(locale),
      })}
    </p>
  );
}
