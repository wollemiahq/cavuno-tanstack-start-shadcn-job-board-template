'use client';

import { boardCopy } from '#/copy';

import {
  EMPLOYMENT_TYPES,
  REMOTE_OPTIONS,
  SENIORITIES,
  seniorityLabels,
  type ListingFilters,
} from '@cavuno/board/filters';
import { fieldLabel, type BoardLabelOverrides } from '@cavuno/board/format';

import { m } from '../../paraglide/messages';

import { JobsFilterToolbar } from '@/components/board/jobs-filter-toolbar';

export function JobsFilterControls({
  filters,
  language,
  labels,
  onChange,
}: {
  filters: ListingFilters;
  language: string;
  labels?: BoardLabelOverrides;
  onChange: (next: ListingFilters) => void;
}) {
  const copy = boardCopy(language, labels);
  const seniorityLabel = seniorityLabels(language, labels);

  return (
    <div data-slot="jobs-filter-bar">
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
          workplace: REMOTE_OPTIONS.map((option) => ({
            value: option,
            label: fieldLabel(language, option, labels) ?? option,
          })),
          employmentType: EMPLOYMENT_TYPES.map((type) => ({
            value: type,
            label: fieldLabel(language, type, labels) ?? type,
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
    </div>
  );
}
