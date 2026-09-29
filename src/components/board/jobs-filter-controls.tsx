'use client';

import {
  DEFAULT_SORT,
  EMPLOYMENT_TYPES,
  REMOTE_OPTIONS,
  SENIORITIES,
  type ListingFilters,
} from '@cavuno/board/filters';
import { ArrowUpDown } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { JobsFilterToolbar } from '@/components/board/jobs-filter-toolbar';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { jobCardCopy } from '@/copy-groups/job-card';
import { jobSearchCopy } from '@/copy-groups/job-search';
import {
  withCustomFieldFilters,
  type CustomFieldSearch,
  type CustomFilterField,
} from '@/lib/custom-field-filters';
import { enumLabel, seniorityLabelMap } from '@/lib/enum-labels';
import { searchString } from '@/lib/pagination';
import type { CustomFieldFilter } from '@cavuno/board';

/** The board's filterable job custom fields and the clauses the URL holds. */
export type JobsCustomFilters = {
  fields: CustomFilterField[];
  active: CustomFieldFilter[];
};

export function JobsFilterControls({
  filters,
  customFilters,
  onChange,
}: {
  filters: ListingFilters;
  customFilters?: JobsCustomFilters;
  language: string;
  /** `next` carries the `cf.*` URL parameters for the custom-field clauses. */
  onChange: (next: ListingFilters & CustomFieldSearch) => void;
}) {
  const copy = {
    jobCard: jobCardCopy(),
    jobSearch: jobSearchCopy(),
  };
  const seniorityLabel = seniorityLabelMap(SENIORITIES);
  const sortItems = [
    { value: 'relevance', label: copy.jobCard.aiRankedLabel },
    { value: 'newest', label: copy.jobCard.sortNewestLabel },
  ] as const;

  return (
    <div data-slot="jobs-filter-bar" className="flex items-center gap-2">
      <JobsFilterToolbar
        labels={{
          workplace: copy.jobSearch.workplacePlaceholder,
          anyWorkplace: copy.jobSearch.anyWorkplaceLabel,
          employmentType: copy.jobSearch.typePlaceholder,
          anyEmploymentType: copy.jobSearch.anyTypeLabel,
          seniority: m.jobSearch_seniorityPlaceholder(),
          allFilters: m.jobSearch_allFiltersLabel(),
          filters: m.jobSearch_filtersLabel(),
          sheetDescription: customFilters?.fields.length
            ? m.jobSearch_filterSheetDescriptionWithCustomFields()
            : m.jobSearch_filterSheetDescription(),
          reset: m.jobSearch_resetLabel(),
          apply: m.jobSearch_applyFiltersLabel(),
          close: m.employerCompany_closeLabel(),
        }}
        options={{
          workplace: REMOTE_OPTIONS.map((option) => ({
            value: option,
            label: enumLabel(option) ?? option,
          })),
          employmentType: EMPLOYMENT_TYPES.map((type) => ({
            value: type,
            label: enumLabel(type) ?? type,
          })),
          seniority: SENIORITIES.map((seniority) => ({
            value: seniority,
            label: seniorityLabel[seniority],
          })),
          customFields: { job: customFilters?.fields },
        }}
        value={{
          workplace: filters.remoteOption,
          employmentType: filters.employmentType,
          seniority: filters.seniority,
          customFields: { job: customFilters?.active },
        }}
        onApply={(value) => {
          const nextFilters: ListingFilters = {
            ...filters,
            // SAFETY: JobsFilterToolbar options are built from REMOTE_OPTIONS.
            remoteOption: value.workplace as ListingFilters['remoteOption'],
            // SAFETY: JobsFilterToolbar options are built from EMPLOYMENT_TYPES.
            employmentType:
              value.employmentType as ListingFilters['employmentType'],
            // SAFETY: JobsFilterToolbar seniority options are built from SENIORITIES.
            seniority: value.seniority as ListingFilters['seniority'],
          };
          onChange(
            withCustomFieldFilters(nextFilters, value.customFields?.job ?? []),
          );
        }}
        onReset={() =>
          onChange(
            withCustomFieldFilters(
              {
                ...filters,
                remoteOption: undefined,
                employmentType: undefined,
                seniority: undefined,
              },
              [],
            ),
          )
        }
      />
      <Select
        items={sortItems}
        value={filters.sort ?? DEFAULT_SORT}
        onValueChange={(sort) =>
          onChange({
            ...filters,
            // SAFETY: Sort select items are built from the listing sort enum.
            sort: searchString(sort) as ListingFilters['sort'],
          })
        }
      >
        <SelectTrigger
          aria-label={copy.jobSearch.sortPlaceholder}
          className="ms-auto"
        >
          <ArrowUpDown aria-hidden="true" />
          <span>{copy.jobSearch.sortPlaceholder}:</span>
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
