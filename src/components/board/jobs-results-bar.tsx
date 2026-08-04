'use client';

import { m } from '../../paraglide/messages';

import { jobSearchCopy } from '@/copy-groups/job-search';
import { cn } from '@/lib/utils';
/** The honest result count and current page range directly above the cards. */
export function JobsResultsBar({
  count,
  page,
  pageSize,
  heading,
  language,
  className,
}: {
  /** Total result count when the API returned one. */
  count?: number;
  /** Current 1-based page + page size — renders the honest "Showing X–Y of Z" range. */
  page?: number;
  pageSize?: number;
  /** Route context, such as “Engineering jobs” or “Jobs in Sydney”. */
  heading?: string;
  language: string;
  className?: string;
}) {
  const showRange =
    typeof count === 'number' &&
    typeof page === 'number' &&
    typeof pageSize === 'number' &&
    count > 0;
  const totalLabel =
    typeof count === 'number'
      ? heading
        ? m.jobSearch_contextualResultsHeading({
            count: count.toLocaleString(language),
            heading,
          })
        : count === 1
          ? m.jobSearch_resultsCountOne({
              count: count.toLocaleString(language),
            })
          : m.jobSearch_resultsCountMany({
              count: count.toLocaleString(language),
            })
      : (heading ?? jobSearchCopy(language).headingJobs);
  const rangeLabel = showRange
    ? m.jobSearch_resultsShowingRange({
        from: ((page - 1) * pageSize + 1).toLocaleString(language),
        to: Math.min(page * pageSize, count).toLocaleString(language),
        count: count.toLocaleString(language),
      })
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
        {rangeLabel ? (
          <p className="text-muted-foreground text-xs">{rangeLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
