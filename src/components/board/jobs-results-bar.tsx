"use client";

import { DEFAULT_SORT, JOB_SORTS, sortLabels } from "@cavuno/board/filters";
import { boardCopy } from "#/copy";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { m } from "../../paraglide/messages";
/**
 * The results header bar (CAV-495) — the Himalayas "count + sort on one line"
 * idiom. The honest total-result count sits on the left, the sort control on
 * the right, in a single row directly above the card grid (replacing the
 * header eyebrow badge + the sort dropdown buried in the filter bar). Dumb +
 * callback-driven: `sort` is the active `ListingFilters["sort"]`, edits go out
 * through `onSortChange` with the SAME sort enum the URL already carries.
 */
import type { ListingFilters } from "@cavuno/board/filters";
import type { BoardLabelOverrides } from "@cavuno/board/format";

export function JobsResultsBar({
  count,
  page,
  pageSize,
  heading,
  sort,
  language,
  labels,
  onSortChange,
}: {
  /** Total result count when the API returned one. */
  count?: number;
  /** Current 1-based page + page size — renders the honest "Showing X–Y of Z" range. */
  page?: number;
  pageSize?: number;
  /** Route context, such as “Engineering jobs” or “Jobs in Sydney”. */
  heading?: string;
  sort: ListingFilters["sort"];
  language: string;
  /** Operator label overrides (`board.context().labels`), ADR-0059. */
  labels?: BoardLabelOverrides;
  onSortChange: (sort: ListingFilters["sort"]) => void;
}) {
  const sortLabel = sortLabels(language, labels);
  const sortItems = JOB_SORTS.map((value) => ({ value, label: sortLabel[value] }));

  const showRange =
    typeof count === "number" &&
    typeof page === "number" &&
    typeof pageSize === "number" &&
    count > pageSize;
  const totalLabel =
    typeof count === "number"
      ? heading
        ? m.jobSearch_contextualResultsHeading({
            count: count.toLocaleString(language),
            heading,
          })
        : count === 1
          ? m.jobSearch_resultsCountOne({ count: count.toLocaleString(language) })
          : m.jobSearch_resultsCountMany({ count: count.toLocaleString(language) })
      : (heading ?? boardCopy(language, labels).jobSearch.headingJobs);
  const rangeLabel = showRange
    ? m.jobSearch_resultsShowingRange({
        from: ((page - 1) * pageSize + 1).toLocaleString(language),
        to: Math.min(page * pageSize, count).toLocaleString(language),
        count: count.toLocaleString(language),
      })
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{totalLabel}</h1>
        {rangeLabel ? <p className="text-xs text-muted-foreground">{rangeLabel}</p> : null}
      </div>
      <Select
        items={sortItems}
        value={sort ?? DEFAULT_SORT}
        onValueChange={(value) => onSortChange(value as ListingFilters["sort"])}
      >
        <SelectTrigger
          aria-label={boardCopy(language, labels).jobSearch.sortPlaceholder}
          className="w-48"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {sortItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
