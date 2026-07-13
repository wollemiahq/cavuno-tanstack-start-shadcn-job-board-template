"use client";

import { useEffect, useState } from "react";

import {
    EMPLOYMENT_TYPES,
    REMOTE_OPTIONS,
    SENIORITIES,
    seniorityLabels,
} from "@cavuno/board/filters";
import { fieldLabel } from "@cavuno/board/format";
import { boardCopy } from "#/copy";

import { Select } from "@/components/base/select/select";
import { MultiSelect } from "@/components/base/select/multi-select";
import { ListingSearchBand } from "@/components/board/listing-page-header";
import { seniorityFromSelection, selectionFromSeniority } from "@/lib/seniority-filter";
import { m } from "../../paraglide/messages";
/**
 * Listing search controls (CAV-485, refined CAV-495/497/502). Feeds the
 * shared `ListingSearchBand` (the ONE white search panel): a keyword+location
 * search row (with Clear when anything is active), over a facet-pill row
 * of the canonical filter enums
 * (remote / employment / seniority) from `@cavuno/board/filters` — the same
 * values the hosted board and the v1 API accept, so every change passes
 * straight through to `board.jobs`. Sort now lives in the results bar (the
 * Himalayas "count + sort" idiom), not in this filter bar.
 *
 * Seniority is the in-tree Untitled UI `MultiSelect` (react-aria `Selection`),
 * bridged to the `seniority[]` URL filter by `@/lib/seniority-filter` so the
 * search-param semantics are unchanged: an empty selection clears the filter.
 *
 * Controlled + callback-driven: the active `ListingFilters` arrive as a prop
 * and every edit goes out through `onChange` with the FULL next filter set.
 */
import type { ListingFilters } from "@cavuno/board/filters";
import type { BoardLabelOverrides } from "@cavuno/board/format";

/** Sentinel id for the "Any …" option (maps to an undefined filter). */
const ANY = "any";

export function JobsSearchControls({
    filters,
    language,
    labels,
    onChange,
    locationSlot,
}: {
    filters: ListingFilters;
    language: string;
    /** Operator label overrides (`board.context().labels`), ADR-0059. */
    labels?: BoardLabelOverrides;
    /** Receives the complete next filter set on every edit. */
    onChange: (next: ListingFilters) => void;
    /** Optional location autocomplete (board-specific — see wiring docs). */
    locationSlot?: React.ReactNode;
}) {
    const copy = boardCopy(language, labels);
    const seniorityLabel = seniorityLabels(language, labels);

    // The keyword is SUBMIT-ONLY (CAV-517): it lives in local state and reaches
    // the URL only on form submit (Enter in the field or the Search button) —
    // never per keystroke. Seeded from the committed `filters.q` so a `?q=…`
    // load shows the term, and re-seeded when the URL changes under it
    // (navigation, an inline clear + submit).
    const [keyword, setKeyword] = useState(filters.q ?? "");
    useEffect(() => {
        setKeyword(filters.q ?? "");
    }, [filters.q]);

    // A facet edit commits IMMEDIATELY (unchanged), carrying the currently
    // typed keyword so changing a dropdown never drops an as-yet-unsubmitted
    // keyword.
    const set = (patch: Partial<ListingFilters>) =>
        onChange({ ...filters, q: keyword || undefined, ...patch });

    const remoteItems = [
        { id: ANY, label: copy.jobSearch.anyWorkplaceLabel },
        ...REMOTE_OPTIONS.map((option) => ({ id: option, label: fieldLabel(language, option, labels) ?? option })),
    ];
    const typeItems = [
        { id: ANY, label: copy.jobSearch.anyTypeLabel },
        ...EMPLOYMENT_TYPES.map((type) => ({ id: type, label: fieldLabel(language, type, labels) ?? type })),
    ];
    const seniorityItems = SENIORITIES.map((seniority) => ({ id: seniority, label: seniorityLabel[seniority] }));

    return (
        <ListingSearchBand
            value={keyword}
            onChange={setKeyword}
            onSubmit={() => onChange({ ...filters, q: keyword || undefined })}
            placeholder={copy.jobSearch.keywordPlaceholder}
            inputAriaLabel={copy.jobSearch.keywordLabel}
            searchLabel={m.jobSearch_searchButtonLabel()}
            leadingSlot={locationSlot}
            belowSlot={
                // The facet pills: workplace / type / seniority — the filters
                // the API actually serves. Equal thirds when stacked.
                <div className="grid gap-3 sm:grid-cols-3 lg:flex">
                    <Select
                        aria-label={copy.jobSearch.workplacePlaceholder}
                        placeholder={copy.jobSearch.workplacePlaceholder}
                        selectedKey={filters.remoteOption ?? ANY}
                        onSelectionChange={(key) =>
                            set({
                                remoteOption: key === ANY ? undefined : (key as ListingFilters["remoteOption"]),
                            })
                        }
                        items={remoteItems}
                        className="lg:w-44"
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>

                    <Select
                        aria-label={copy.jobSearch.typePlaceholder}
                        placeholder={copy.jobSearch.typePlaceholder}
                        selectedKey={filters.employmentType ?? ANY}
                        onSelectionChange={(key) =>
                            set({
                                employmentType: key === ANY ? undefined : (key as ListingFilters["employmentType"]),
                            })
                        }
                        items={typeItems}
                        className="lg:w-40"
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>

                    {/* Deselecting every level already clears the `seniority`
                        filter, so the Reset / Select-all footer is dropped. */}
                    <MultiSelect
                        placeholder={m.jobSearch_seniorityPlaceholder()}
                        items={seniorityItems}
                        selectedKeys={selectionFromSeniority(filters.seniority)}
                        onSelectionChange={(keys) => set({ seniority: seniorityFromSelection(keys) })}
                        showFooter={false}
                        showSearch={false}
                        selectedCountFormatter={(count) => m.jobSearch_senioritySelectedCount({ count })}
                        className="lg:w-44"
                    >
                        {(item) => <MultiSelect.Item id={item.id} label={item.label} />}
                    </MultiSelect>
                </div>
            }
        />
    );
}
