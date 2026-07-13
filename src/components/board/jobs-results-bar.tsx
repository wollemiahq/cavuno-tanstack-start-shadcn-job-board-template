"use client";

import { DEFAULT_SORT, JOB_SORTS, sortLabels } from "@cavuno/board/filters";
import { boardCopy } from "#/copy";

import { Select } from "@/components/base/select/select";
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
    sort: ListingFilters["sort"];
    language: string;
    /** Operator label overrides (`board.context().labels`), ADR-0059. */
    labels?: BoardLabelOverrides;
    onSortChange: (sort: ListingFilters["sort"]) => void;
}) {
    const sortLabel = sortLabels(language, labels);
    const sortItems = JOB_SORTS.map((value) => ({ id: value, label: sortLabel[value] }));

    const showRange =
        typeof count === "number" && typeof page === "number" && typeof pageSize === "number" && count > pageSize;
    const countLabel =
        typeof count === "number"
            ? showRange
                ? m.jobSearch_resultsShowingRange({
                      from: ((page - 1) * pageSize + 1).toLocaleString(language),
                      to: Math.min(page * pageSize, count).toLocaleString(language),
                      count: count.toLocaleString(language),
                  })
                : count === 1
                  ? m.jobSearch_resultsCountOne({ count: count.toLocaleString(language) })
                  : m.jobSearch_resultsCountMany({ count: count.toLocaleString(language) })
            : null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary pb-4">
            <p className="text-md font-semibold text-primary">{countLabel}</p>
            <Select
                aria-label={boardCopy(language, labels).jobSearch.sortPlaceholder}
                selectedKey={sort ?? DEFAULT_SORT}
                onSelectionChange={(key) => onSortChange(key as ListingFilters["sort"])}
                items={sortItems}
                className="w-48"
            >
                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
        </div>
    );
}
