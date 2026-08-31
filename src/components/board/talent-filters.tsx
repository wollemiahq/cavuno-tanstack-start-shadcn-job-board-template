"use client";

import { useId, useState, type ReactNode } from "react";

import { useNavigate } from "@tanstack/react-router";
import { ArrowUpDown, XIcon } from "lucide-react";

import { m } from "../../paraglide/messages";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { UrlSearchInput } from "@/lib/pagination";
import { parseTalentSearch, type TalentSearch } from "@/lib/talent-search";

const ANY = "__any__";
const DEFAULT_SORT = "relevance" as const;

const STATUS_OPTIONS = [
  { value: "actively_looking", label: () => m.talentFilters_statusActive() },
  { value: "open_to_offers", label: () => m.talentFilters_statusOpen() },
] as const;

const RELOCATE_OPTIONS = [
  { value: "true", label: () => m.talentFilters_relocateYes() },
  { value: "false", label: () => m.talentFilters_relocateNo() },
] as const;

type TalentToolbarFacets = {
  jobSearchStatus?: string;
  openToRelocate?: string;
};

function facetsFromSearch(search: TalentSearch): TalentToolbarFacets {
  return {
    jobSearchStatus: search.jobSearchStatus,
    openToRelocate: search.openToRelocate,
  };
}

function facetCount(facets: TalentToolbarFacets) {
  return (
    Number(Boolean(facets.jobSearchStatus)) +
    Number(Boolean(facets.openToRelocate))
  );
}

function selectString(nextValue: unknown): string | undefined {
  if (typeof nextValue === "string") return nextValue;
  if (
    nextValue &&
    typeof nextValue === "object" &&
    "value" in nextValue &&
    typeof nextValue.value === "string"
  ) {
    return nextValue.value;
  }
  return undefined;
}

function FilterSelect({
  label,
  anyLabel,
  options,
  value,
  onValueChange,
  showLabel = false,
}: {
  label: string;
  anyLabel: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value?: string;
  onValueChange: (value: string | undefined) => void;
  showLabel?: boolean;
}) {
  const values = [ANY, ...options.map((option) => option.value)];
  const labels = Object.fromEntries([
    [ANY, anyLabel],
    ...options.map((option) => [option.value, option.label] as const),
  ]);
  const selectValue = values.includes(value ?? ANY) ? (value ?? ANY) : ANY;
  const controlId = useId();

  return (
    <Field className="w-auto gap-0">
      <FieldLabel htmlFor={controlId} className={showLabel ? undefined : "sr-only"}>
        {label}
      </FieldLabel>
      <Select
        items={values}
        value={selectValue}
        itemToStringLabel={(item) => labels[item] ?? item}
        onValueChange={(nextValue) => {
          const raw = selectString(nextValue);
          const next = raw === ANY || raw == null ? undefined : raw;
          if (next === value) return;
          onValueChange(next);
        }}
      >
        <SelectTrigger id={controlId} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {values.map((item) => (
              <SelectItem key={item} value={item}>
                {labels[item]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function TalentFilters({ search, lists }: { search: TalentSearch; lists?: ReactNode }) {
  const navigate = useNavigate({ from: "/talent/" });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<TalentToolbarFacets>({});
  const facets = facetsFromSearch(search);
  const activeCount = facetCount(facets);
  const statusOptions = STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label(),
  }));
  const relocateOptions = RELOCATE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label(),
  }));
  const sortItems = [
    { value: "relevance", label: m.talentFilters_sortBestMatch() },
    { value: "newest", label: m.talentFilters_sortNewest() },
  ] as const;

  const commit = (patch: UrlSearchInput) => {
    void navigate({
      search: (previous) =>
        parseTalentSearch({
          ...previous,
          ...patch,
          page: undefined,
          sourced: undefined,
        }),
    });
  };

  const commitFacets = (next: TalentToolbarFacets) => {
    commit({
      jobSearchStatus: next.jobSearchStatus,
      openToRelocate: next.openToRelocate,
    });
  };

  const resetFacets = () =>
    commit({
      jobSearchStatus: undefined,
      openToRelocate: undefined,
    });

  const openSheet = () => {
    setDraft({ ...facets });
    setSheetOpen(true);
  };

  const closeSheet = () => setSheetOpen(false);

  const applyDraft = () => {
    commitFacets({
      jobSearchStatus: draft.jobSearchStatus,
      openToRelocate: draft.openToRelocate,
    });
    closeSheet();
  };

  const sheet = (
    <Sheet
      open={sheetOpen}
      onOpenChange={(open) => {
        if (!open) closeSheet();
      }}
    >
      <SheetContent side="right" showCloseButton={false}>
        <SheetClose
          render={
            <Button variant="ghost" className="bg-secondary absolute end-4 top-4" size="icon-sm" />
          }
        >
          <XIcon aria-hidden="true" />
          <span className="sr-only">{m.employerCompany_closeLabel()}</span>
        </SheetClose>
        <SheetHeader>
          <SheetTitle>{m.jobSearch_filtersLabel()}</SheetTitle>
          <SheetDescription>{m.talentFilters_filterSheetDescription()}</SheetDescription>
        </SheetHeader>

        <FieldGroup className="flex flex-1 gap-6 overflow-y-auto px-6 py-2">
          <FilterSelect
            label={m.talentFilters_statusLabel()}
            anyLabel={m.talentFilters_anyStatusOption()}
            options={statusOptions}
            value={draft.jobSearchStatus}
            onValueChange={(jobSearchStatus) => setDraft({ ...draft, jobSearchStatus })}
            showLabel
          />
          <FilterSelect
            label={m.talentFilters_relocateLabel()}
            anyLabel={m.talentFilters_anyRelocateOption()}
            options={relocateOptions}
            value={draft.openToRelocate}
            onValueChange={(openToRelocate) => setDraft({ ...draft, openToRelocate })}
            showLabel
          />
        </FieldGroup>

        <SheetFooter className="flex-row items-center border-t">
          <Button type="button" variant="ghost" onClick={() => setDraft({})}>
            {m.jobSearch_resetLabel()}
          </Button>
          <Button type="button" className="flex-1" onClick={applyDraft}>
            {m.jobSearch_applyFiltersLabel()}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );

  return (
    <div data-slot="talent-filter-bar" className="flex items-center gap-2">
      {lists}
      <div className="hidden items-center gap-2 md:flex">
        <FilterSelect
          label={m.talentFilters_statusLabel()}
          anyLabel={m.talentFilters_anyStatusOption()}
          options={statusOptions}
          value={search.jobSearchStatus}
          onValueChange={(jobSearchStatus) => commitFacets({ ...facets, jobSearchStatus })}
        />
        <FilterSelect
          label={m.talentFilters_relocateLabel()}
          anyLabel={m.talentFilters_anyRelocateOption()}
          options={relocateOptions}
          value={search.openToRelocate}
          onValueChange={(openToRelocate) => commitFacets({ ...facets, openToRelocate })}
        />
        {activeCount > 0 && (
          <Button type="button" variant="ghost" onClick={resetFacets}>
            {m.jobSearch_resetLabel()}
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="md:hidden"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        onClick={openSheet}
      >
        {m.jobSearch_filtersLabel()}
        {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
      </Button>

      {sheet}

      <Select
        items={["relevance", "newest"]}
        value={search.sort ?? DEFAULT_SORT}
        itemToStringLabel={(item) =>
          item === "newest" ? m.talentFilters_sortNewest() : m.talentFilters_sortBestMatch()
        }
        onValueChange={(sort) => {
          const raw = selectString(sort);
          const next = raw === "relevance" || raw === "newest" ? raw : undefined;
          if (next === (search.sort ?? DEFAULT_SORT) || (next === DEFAULT_SORT && !search.sort)) {
            return;
          }
          commit({ sort: next });
        }}
      >
        <SelectTrigger aria-label={m.jobSearch_sortPlaceholder()} className="ms-auto">
          <ArrowUpDown aria-hidden="true" />
          <span>{m.jobSearch_sortPlaceholder()}:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
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
