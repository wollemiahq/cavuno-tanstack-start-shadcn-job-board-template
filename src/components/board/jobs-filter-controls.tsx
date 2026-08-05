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
import { enumLabel, seniorityLabelMap } from '@/lib/enum-labels';

export function JobsFilterControls({
  filters,
  onChange,
}: {
  filters: ListingFilters;
  language: string;
  onChange: (next: ListingFilters) => void;
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
          sheetDescription: m.jobSearch_filterSheetDescription(),
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
        }}
        value={{
          workplace: filters.remoteOption,
          employmentType: filters.employmentType,
          seniority: filters.seniority,
        }}
        onApply={(value) =>
          onChange({
            ...filters,
            remoteOption: value.workplace as ListingFilters['remoteOption'],
            employmentType:
              value.employmentType as ListingFilters['employmentType'],
            seniority: value.seniority as ListingFilters['seniority'],
          })
        }
        onReset={() =>
          onChange({
            ...filters,
            remoteOption: undefined,
            employmentType: undefined,
            seniority: undefined,
          })
        }
      />
      <Select
        items={sortItems}
        value={filters.sort ?? DEFAULT_SORT}
        onValueChange={(sort) =>
          onChange({ ...filters, sort: sort as ListingFilters['sort'] })
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
