'use client';

import { m } from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime';

import { jobSearchCopy } from '@/copy-groups/job-search';
import { cn } from '@/lib/utils';

function finiteNumber(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return value;
}

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
  // Viewer chrome locale for number/plural formatting (prop kept for call-site
  // compatibility; prefer getLocale() so a stale prop cannot drift).
  const locale = language || getLocale();
  const totalCount = finiteNumber(count);
  const currentPage = finiteNumber(page);
  const currentPageSize = finiteNumber(pageSize);
  const showRange =
    totalCount !== undefined &&
    currentPage !== undefined &&
    currentPageSize !== undefined &&
    totalCount > 0;
  const totalLabel =
    totalCount !== undefined
      ? heading
        ? m.jobSearch_contextualResultsHeading({
            count: totalCount.toLocaleString(locale),
            heading,
          })
        : new Intl.PluralRules(locale).select(totalCount) === 'one'
          ? m.jobSearch_resultsCountOne({
              count: totalCount.toLocaleString(locale),
            })
          : m.jobSearch_resultsCountMany({
              count: totalCount.toLocaleString(locale),
            })
      : (heading ?? jobSearchCopy().headingJobs);
  const rangeLabel = showRange
    ? m.jobSearch_resultsShowingRange({
        from: ((currentPage - 1) * currentPageSize + 1).toLocaleString(locale),
        to: Math.min(currentPage * currentPageSize, totalCount).toLocaleString(
          locale,
        ),
        count: totalCount.toLocaleString(locale),
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
