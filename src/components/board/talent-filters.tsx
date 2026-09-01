'use client';

import { memo, useId, useState, type ReactNode } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { ArrowUpDown, XIcon } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { UrlSearchInput } from '@/lib/pagination';
import { parseTalentSearch, type TalentSearch } from '@/lib/talent-search';

const ANY = '__any__';
const DEFAULT_SORT = 'relevance' as const;
const STATUS_VALUES = [ANY, 'actively_looking', 'open_to_offers'];
const RELOCATE_VALUES = [ANY, 'true', 'false'];
const SORT_VALUES = ['relevance', 'newest'];

function statusLabel(value: string): string {
  switch (value) {
    case 'actively_looking':
      return m.talentFilters_statusActive();
    case 'open_to_offers':
      return m.talentFilters_statusOpen();
    default:
      return m.talentFilters_anyStatusOption();
  }
}

function relocateLabel(value: string): string {
  switch (value) {
    case 'true':
      return m.talentFilters_relocateYes();
    case 'false':
      return m.talentFilters_relocateNo();
    default:
      return m.talentFilters_anyRelocateOption();
  }
}

function sortLabel(value: string): string {
  return value === 'newest'
    ? m.talentFilters_sortNewest()
    : m.talentFilters_sortBestMatch();
}

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

function FilterSelect({
  label,
  values,
  labelFor,
  value,
  onValueChange,
  showLabel = false,
}: {
  label: string;
  values: readonly string[];
  labelFor: (value: string) => string;
  value?: string;
  onValueChange: (value: string | undefined) => void;
  showLabel?: boolean;
}) {
  // Module-level `values` + `labelFor` stay referentially stable. Inline
  // `itemToStringLabel` / new `items` arrays re-sync Base UI's ReactStore
  // on every auto-select render and loop SelectRoot (React #185).
  const selectValue = values.includes(value ?? ANY) ? (value ?? ANY) : ANY;
  const controlId = useId();

  return (
    <Field className="w-auto gap-0">
      <FieldLabel
        htmlFor={controlId}
        className={showLabel ? undefined : 'sr-only'}
      >
        {label}
      </FieldLabel>
      <Select
        items={values}
        value={selectValue}
        itemToStringLabel={labelFor}
        onValueChange={(nextValue) => {
          const next =
            nextValue === ANY || nextValue == null ? undefined : nextValue;
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
                {labelFor(item)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

type TalentFiltersProps = {
  search: TalentSearch;
  lists?: ReactNode;
  linkJob?: ReactNode;
};

function talentFiltersAreEqual(
  prev: TalentFiltersProps,
  next: TalentFiltersProps,
) {
  // Ignore `selectedTalent` (and other listing params). Desktop auto-select
  // rewrites that param on arrival; re-rendering these Selects mid-mount is
  // what trips React #185 in Base UI's store sync.
  return (
    prev.search.jobSearchStatus === next.search.jobSearchStatus &&
    prev.search.openToRelocate === next.search.openToRelocate &&
    prev.search.sort === next.search.sort &&
    prev.search.list === next.search.list &&
    prev.lists === next.lists &&
    prev.linkJob === next.linkJob
  );
}

export const TalentFilters = memo(function TalentFilters({
  search,
  lists,
  linkJob,
}: TalentFiltersProps) {
  const navigate = useNavigate({ from: '/talent/' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<TalentToolbarFacets>({});
  const facets = facetsFromSearch(search);
  const activeCount = facetCount(facets);

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
            <Button
              variant="ghost"
              className="bg-secondary absolute end-4 top-4"
              size="icon-sm"
            />
          }
        >
          <XIcon aria-hidden="true" />
          <span className="sr-only">{m.employerCompany_closeLabel()}</span>
        </SheetClose>
        <SheetHeader>
          <SheetTitle>{m.jobSearch_filtersLabel()}</SheetTitle>
          <SheetDescription>
            {m.talentFilters_filterSheetDescription()}
          </SheetDescription>
        </SheetHeader>

        <FieldGroup className="flex flex-1 gap-6 overflow-y-auto px-6 py-2">
          <FilterSelect
            label={m.talentFilters_statusLabel()}
            values={STATUS_VALUES}
            labelFor={statusLabel}
            value={draft.jobSearchStatus}
            onValueChange={(jobSearchStatus) =>
              setDraft({ ...draft, jobSearchStatus })
            }
            showLabel
          />
          <FilterSelect
            label={m.talentFilters_relocateLabel()}
            values={RELOCATE_VALUES}
            labelFor={relocateLabel}
            value={draft.openToRelocate}
            onValueChange={(openToRelocate) =>
              setDraft({ ...draft, openToRelocate })
            }
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
          values={STATUS_VALUES}
          labelFor={statusLabel}
          value={search.jobSearchStatus}
          onValueChange={(jobSearchStatus) =>
            commitFacets({ ...facets, jobSearchStatus })
          }
        />
        <FilterSelect
          label={m.talentFilters_relocateLabel()}
          values={RELOCATE_VALUES}
          labelFor={relocateLabel}
          value={search.openToRelocate}
          onValueChange={(openToRelocate) =>
            commitFacets({ ...facets, openToRelocate })
          }
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

      <div className="ms-auto flex min-w-0 items-center gap-2">
        {linkJob}
        <Select
          items={SORT_VALUES}
          value={search.sort ?? DEFAULT_SORT}
          itemToStringLabel={sortLabel}
          onValueChange={(sort) => {
            const next =
              sort === 'relevance' || sort === 'newest' ? sort : undefined;
            if (
              next === (search.sort ?? DEFAULT_SORT) ||
              (next === DEFAULT_SORT && !search.sort)
            ) {
              return;
            }
            commit({ sort: next });
          }}
        >
          <SelectTrigger aria-label={m.jobSearch_sortPlaceholder()}>
            <ArrowUpDown aria-hidden="true" />
            <span>{m.jobSearch_sortPlaceholder()}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {SORT_VALUES.map((item) => (
                <SelectItem key={item} value={item}>
                  {sortLabel(item)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}, talentFiltersAreEqual);
