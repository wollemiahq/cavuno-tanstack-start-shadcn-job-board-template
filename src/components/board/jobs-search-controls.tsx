"use client";

import { useEffect, useRef, useState } from "react";

import { Search, X } from "lucide-react";

import {
  EMPLOYMENT_TYPES,
  REMOTE_OPTIONS,
  SENIORITIES,
  seniorityLabels,
} from "@cavuno/board/filters";
import { fieldLabel } from "@cavuno/board/format";
import { boardCopy } from "#/copy";

import { JobsFilterToolbar } from "@/components/board/jobs-filter-toolbar";
import { LocationCombobox, type LocationSuggestionState } from "@/components/location-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { m } from "../../paraglide/messages";
/**
 * Job search controls: one Rhea surface with separate keyword and canonical
 * location fields committed by the same form, over the canonical filter enums
 * (remote / employment / seniority) from `@cavuno/board/filters` — the same
 * values the hosted board and the v1 API accept, so every change passes
 * straight through to `board.jobs`. Sort now lives in the results bar (the
 * Himalayas "count + sort" idiom), not in this filter bar.
 *
 * Desktop exposes the two common filters inline; the owned shadcn Sheet holds
 * the complete filter set and stages edits until Apply.
 *
 * Controlled + callback-driven: the active `ListingFilters` arrive as a prop
 * and every edit goes out through `onChange` with the FULL next filter set.
 */
import type { ListingFilters } from "@cavuno/board/filters";
import type { BoardLabelOverrides } from "@cavuno/board/format";

export function JobsSearchControls({
  filters,
  language,
  labels,
  onChange,
  onSearchSubmit,
  location,
  locationSuggestions,
}: {
  filters: ListingFilters;
  language: string;
  /** Operator label overrides (`board.context().labels`), ADR-0059. */
  labels?: BoardLabelOverrides;
  /** Receives the complete next filter set on every edit. */
  onChange: (next: ListingFilters) => void;
  /** Commits the keyword and canonical place together through the shared form. */
  onSearchSubmit?: (next: ListingFilters, location: { slug: string; name: string } | null) => void;
  /** Active canonical location restored from the listing URL. */
  location?: { slug: string; label: string };
  /** Route-owned autocomplete results for the location input. */
  locationSuggestions?: LocationSuggestionState;
}) {
  const copy = boardCopy(language, labels);
  const seniorityLabel = seniorityLabels(language, labels);
  const keywordRef = useRef<HTMLInputElement>(null);

  // The keyword is SUBMIT-ONLY (CAV-517): it lives in local state and reaches
  // the URL only on form submit (Enter in the field or the Search button) —
  // never per keystroke. Seeded from the committed `filters.q` so a `?q=…`
  // load shows the term, and re-seeded when the URL changes under it
  // (navigation, an inline clear + submit).
  const [keyword, setKeyword] = useState(filters.q ?? "");
  useEffect(() => {
    setKeyword(filters.q ?? "");
  }, [filters.q]);
  const [selectedLocation, setSelectedLocation] = useState<{
    slug: string;
    name: string;
  } | null>(location ? { slug: location.slug, name: location.label } : null);
  useEffect(() => {
    setSelectedLocation(location ? { slug: location.slug, name: location.label } : null);
  }, [location?.label, location?.slug]);

  // A facet edit commits IMMEDIATELY (unchanged), carrying the currently
  // typed keyword so changing a dropdown never drops an as-yet-unsubmitted
  // keyword.
  const set = (patch: Partial<ListingFilters>) => onChange({ ...filters, ...patch });

  const locationField = locationSuggestions ? (
    <LocationCombobox
      {...locationSuggestions}
      value={selectedLocation?.slug}
      valueLabel={selectedLocation?.name}
      onSelect={setSelectedLocation}
      onClear={() => setSelectedLocation(null)}
    />
  ) : undefined;

  const remoteItems = REMOTE_OPTIONS.map((option) => ({
    value: option,
    label: fieldLabel(language, option, labels) ?? option,
  }));
  const typeItems = EMPLOYMENT_TYPES.map((type) => ({
    value: type,
    label: fieldLabel(language, type, labels) ?? type,
  }));
  const seniorityItems = SENIORITIES.map((seniority) => ({
    value: seniority,
    label: seniorityLabel[seniority],
  }));

  const filterToolbar = (
    <JobsFilterToolbar
      labels={{
        workplace: copy.jobSearch.workplacePlaceholder,
        anyWorkplace: copy.jobSearch.anyWorkplaceLabel,
        employmentType: copy.jobSearch.typePlaceholder,
        anyEmploymentType: copy.jobSearch.anyTypeLabel,
        seniority: m.jobSearch_seniorityPlaceholder(),
        allFilters: m.jobSearch_allFiltersLabel(),
        filters: m.jobSearch_filtersLabel(),
        sheetDescription: m.jobSearch_filterSheetDescription(),
        reset: m.jobSearch_resetLabel(),
        apply: m.jobSearch_applyFiltersLabel(),
        cancel: m.jobSearch_cancelLabel(),
      }}
      options={{
        workplace: remoteItems,
        employmentType: typeItems,
        seniority: seniorityItems,
      }}
      value={{
        workplace: filters.remoteOption,
        employmentType: filters.employmentType,
        seniority: filters.seniority,
      }}
      onApply={(value) =>
        set({
          remoteOption: value.workplace as ListingFilters["remoteOption"],
          employmentType: value.employmentType as ListingFilters["employmentType"],
          seniority: value.seniority as ListingFilters["seniority"],
        })
      }
      onReset={() =>
        set({
          remoteOption: undefined,
          employmentType: undefined,
          seniority: undefined,
        })
      }
    />
  );

  return (
    <form
      data-slot="jobs-search-form"
      className="rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const next = { ...filters, q: keyword || undefined };
        if (onSearchSubmit) {
          onSearchSubmit(next, selectedLocation);
          return;
        }
        onChange(next);
      }}
    >
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.7fr)_auto]">
        <div className="relative min-w-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={keywordRef}
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={copy.jobSearch.keywordPlaceholder}
            aria-label={copy.jobSearch.keywordLabel}
            className="h-11 bg-background pr-9 pl-9"
          />
          {keyword ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={m.searchBar_clearAriaLabel()}
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
              onClick={() => {
                setKeyword("");
                keywordRef.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        {locationField}
        <Button type="submit" size="lg" className="h-11 md:px-6">
          <Search aria-hidden="true" />
          {m.jobSearch_searchButtonLabel()}
        </Button>
      </div>
      <div className="mt-3 border-t border-border pt-3">{filterToolbar}</div>
    </form>
  );
}
