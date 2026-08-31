'use client';

import { useId, useState, type ReactNode } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { ArrowUpDown, XIcon } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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

const STATUS_OPTIONS = [
  { value: 'actively_looking', label: () => m.talentFilters_statusActive() },
  { value: 'open_to_offers', label: () => m.talentFilters_statusOpen() },
] as const;

const RELOCATE_OPTIONS = [
  { value: 'true', label: () => m.talentFilters_relocateYes() },
  { value: 'false', label: () => m.talentFilters_relocateNo() },
] as const;

type TalentToolbarFacets = {
  jobSearchStatus?: string;
  openToRelocate?: string;
  skill?: string;
  languages?: string;
  seniority?: string;
  permitCountry?: string;
  interestedRole?: string;
};

function facetsFromSearch(search: TalentSearch): TalentToolbarFacets {
  return {
    jobSearchStatus: search.jobSearchStatus,
    openToRelocate: search.openToRelocate,
    skill: search.skill,
    languages: search.languages,
    seniority: search.seniority,
    permitCountry: search.permitCountry,
    interestedRole: search.interestedRole,
  };
}

function facetCount(facets: TalentToolbarFacets) {
  return (
    Number(Boolean(facets.jobSearchStatus)) +
    Number(Boolean(facets.openToRelocate)) +
    Number(Boolean(facets.skill)) +
    Number(Boolean(facets.languages)) +
    Number(Boolean(facets.seniority)) +
    Number(Boolean(facets.permitCountry)) +
    Number(Boolean(facets.interestedRole))
  );
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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
  const items = [{ value: ANY, label: anyLabel }, ...options];
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
        items={items}
        value={value ?? ANY}
        onValueChange={(nextValue) =>
          onValueChange(
            nextValue === ANY || nextValue == null ? undefined : nextValue,
          )
        }
      >
        <SelectTrigger id={controlId} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function FilterText({
  label,
  name,
  value,
  onValueChange,
}: {
  label: string;
  name: string;
  value?: string;
  onValueChange: (value: string | undefined) => void;
}) {
  const controlId = useId();

  return (
    <Field className="gap-0">
      <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
      <Input
        id={controlId}
        name={name}
        value={value ?? ''}
        onChange={(event) => onValueChange(event.target.value || undefined)}
      />
    </Field>
  );
}

export function TalentFilters({
  search,
  lists,
}: {
  search: TalentSearch;
  lists?: ReactNode;
}) {
  const navigate = useNavigate({ from: '/talent/' });
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Retained while the sheet animates out so its title does not swap mid-exit. */
  const [sheetMode, setSheetMode] = useState<'desktop' | 'mobile'>('desktop');
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
    { value: 'relevance', label: m.talentFilters_sortBestMatch() },
    { value: 'newest', label: m.talentFilters_sortNewest() },
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
      skill: optionalText(next.skill),
      languages: optionalText(next.languages),
      seniority: optionalText(next.seniority),
      permitCountry: optionalText(next.permitCountry),
      interestedRole: optionalText(next.interestedRole),
    });
  };

  const resetFacets = () =>
    commit({
      jobSearchStatus: undefined,
      openToRelocate: undefined,
      skill: undefined,
      languages: undefined,
      seniority: undefined,
      permitCountry: undefined,
      interestedRole: undefined,
    });

  const openSheet = (mode: 'desktop' | 'mobile') => {
    setDraft({ ...facets });
    setSheetMode(mode);
    setSheetOpen(true);
  };

  const closeSheet = () => setSheetOpen(false);

  const applyDraft = () => {
    commitFacets({
      jobSearchStatus: draft.jobSearchStatus,
      openToRelocate: draft.openToRelocate,
      skill: optionalText(draft.skill),
      languages: optionalText(draft.languages),
      seniority: optionalText(draft.seniority),
      permitCountry: optionalText(draft.permitCountry),
      interestedRole: optionalText(draft.interestedRole),
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
          <SheetTitle>
            {sheetMode === 'desktop'
              ? m.jobSearch_allFiltersLabel()
              : m.jobSearch_filtersLabel()}
          </SheetTitle>
          <SheetDescription>
            {m.talentFilters_filterSheetDescription()}
          </SheetDescription>
        </SheetHeader>

        <FieldGroup className="flex flex-1 gap-6 overflow-y-auto px-6 py-2">
          <FilterSelect
            label={m.talentFilters_statusLabel()}
            anyLabel={m.talentFilters_anyStatusOption()}
            options={statusOptions}
            value={draft.jobSearchStatus}
            onValueChange={(jobSearchStatus) =>
              setDraft({ ...draft, jobSearchStatus })
            }
            showLabel
          />
          <FilterSelect
            label={m.talentFilters_relocateLabel()}
            anyLabel={m.talentFilters_anyRelocateOption()}
            options={relocateOptions}
            value={draft.openToRelocate}
            onValueChange={(openToRelocate) =>
              setDraft({ ...draft, openToRelocate })
            }
            showLabel
          />
          <FilterText
            label={m.talentFilters_skillLabel()}
            name="skill"
            value={draft.skill}
            onValueChange={(skill) => setDraft({ ...draft, skill })}
          />
          <FilterText
            label={m.talentFilters_languagesLabel()}
            name="languages"
            value={draft.languages}
            onValueChange={(languages) => setDraft({ ...draft, languages })}
          />
          <FilterText
            label={m.talentFilters_seniorityLabel()}
            name="seniority"
            value={draft.seniority}
            onValueChange={(seniority) => setDraft({ ...draft, seniority })}
          />
          <FilterText
            label={m.talentFilters_permitCountryLabel()}
            name="permitCountry"
            value={draft.permitCountry}
            onValueChange={(permitCountry) =>
              setDraft({ ...draft, permitCountry })
            }
          />
          <FilterText
            label={m.talentFilters_interestedRoleLabel()}
            name="interestedRole"
            value={draft.interestedRole}
            onValueChange={(interestedRole) =>
              setDraft({ ...draft, interestedRole })
            }
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
          onValueChange={(jobSearchStatus) =>
            commitFacets({ ...facets, jobSearchStatus })
          }
        />
        <FilterSelect
          label={m.talentFilters_relocateLabel()}
          anyLabel={m.talentFilters_anyRelocateOption()}
          options={relocateOptions}
          value={search.openToRelocate}
          onValueChange={(openToRelocate) =>
            commitFacets({ ...facets, openToRelocate })
          }
        />
        <Button
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen && sheetMode === 'desktop'}
          onClick={() => openSheet('desktop')}
        >
          {m.jobSearch_allFiltersLabel()}
          {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
        </Button>
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
        aria-expanded={sheetOpen && sheetMode === 'mobile'}
        onClick={() => openSheet('mobile')}
      >
        {m.jobSearch_filtersLabel()}
        {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
      </Button>

      {sheet}

      <Select
        items={sortItems}
        value={search.sort ?? DEFAULT_SORT}
        onValueChange={(sort) => commit({ sort })}
      >
        <SelectTrigger
          aria-label={m.jobSearch_sortPlaceholder()}
          className="ms-auto"
        >
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
