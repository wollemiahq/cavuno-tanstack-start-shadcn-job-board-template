import { m } from '../paraglide/messages';

import type { BoardCopy } from '@/copy';
import {
  resolveCopyGroup,
  type BoardLabelOverrides,
  type CopyOverrides,
  type MessageFn,
} from '@/copy-groups/resolve-copy-group';

const messages = [
  ['allFiltersLabel', m.jobSearch_allFiltersLabel as unknown as MessageFn],
  ['anyTypeLabel', m.jobSearch_anyTypeLabel as unknown as MessageFn],
  ['anyWorkplaceLabel', m.jobSearch_anyWorkplaceLabel as unknown as MessageFn],
  ['applyFiltersLabel', m.jobSearch_applyFiltersLabel as unknown as MessageFn],
  ['cancelLabel', m.jobSearch_cancelLabel as unknown as MessageFn],
  ['clearFiltersLabel', m.jobSearch_clearFiltersLabel as unknown as MessageFn],
  [
    'contextualResultsHeading',
    m.jobSearch_contextualResultsHeading as unknown as MessageFn,
  ],
  ['detailErrorTitle', m.jobSearch_detailErrorTitle as unknown as MessageFn],
  [
    'detailLoadingLabel',
    m.jobSearch_detailLoadingLabel as unknown as MessageFn,
  ],
  [
    'filterSheetDescription',
    m.jobSearch_filterSheetDescription as unknown as MessageFn,
  ],
  ['filteredEmptyText', m.jobSearch_filteredEmptyText as unknown as MessageFn],
  ['filtersLabel', m.jobSearch_filtersLabel as unknown as MessageFn],
  ['gatedCountText', m.jobSearch_gatedCountText as unknown as MessageFn],
  ['headingJobs', m.jobSearch_headingJobs as unknown as MessageFn],
  ['initialEmptyText', m.jobSearch_initialEmptyText as unknown as MessageFn],
  ['keywordLabel', m.jobSearch_keywordLabel as unknown as MessageFn],
  [
    'keywordPlaceholder',
    m.jobSearch_keywordPlaceholder as unknown as MessageFn,
  ],
  ['loadMoreLabel', m.jobSearch_loadMoreLabel as unknown as MessageFn],
  ['locationLabel', m.jobSearch_locationLabel as unknown as MessageFn],
  [
    'locationPlaceholder',
    m.jobSearch_locationPlaceholder as unknown as MessageFn,
  ],
  ['noJobsMatchText', m.jobSearch_noJobsMatchText as unknown as MessageFn],
  [
    'noMatchingResultsHeading',
    m.jobSearch_noMatchingResultsHeading as unknown as MessageFn,
  ],
  ['queryEmptyText', m.jobSearch_queryEmptyText as unknown as MessageFn],
  [
    'resetFiltersAction',
    m.jobSearch_resetFiltersAction as unknown as MessageFn,
  ],
  ['resetLabel', m.jobSearch_resetLabel as unknown as MessageFn],
  ['resultsCountMany', m.jobSearch_resultsCountMany as unknown as MessageFn],
  ['resultsCountOne', m.jobSearch_resultsCountOne as unknown as MessageFn],
  [
    'resultsRegionLabel',
    m.jobSearch_resultsRegionLabel as unknown as MessageFn,
  ],
  [
    'resultsShowingRange',
    m.jobSearch_resultsShowingRange as unknown as MessageFn,
  ],
  ['retryLabel', m.jobSearch_retryLabel as unknown as MessageFn],
  ['searchButtonLabel', m.jobSearch_searchButtonLabel as unknown as MessageFn],
  [
    'selectedJobRegionLabel',
    m.jobSearch_selectedJobRegionLabel as unknown as MessageFn,
  ],
  [
    'seniorityPlaceholder',
    m.jobSearch_seniorityPlaceholder as unknown as MessageFn,
  ],
  [
    'senioritySelectedCount',
    m.jobSearch_senioritySelectedCount as unknown as MessageFn,
  ],
  ['sortPlaceholder', m.jobSearch_sortPlaceholder as unknown as MessageFn],
  ['typePlaceholder', m.jobSearch_typePlaceholder as unknown as MessageFn],
  ['unlockMoreLabel', m.jobSearch_unlockMoreLabel as unknown as MessageFn],
  ['viewFullJobLabel', m.jobSearch_viewFullJobLabel as unknown as MessageFn],
  [
    'workplacePlaceholder',
    m.jobSearch_workplacePlaceholder as unknown as MessageFn,
  ],
] as const;

export function jobSearchCopy(
  _language: string | undefined,
  labels?: BoardLabelOverrides,
): BoardCopy['jobSearch'] {
  return resolveCopyGroup(
    messages,
    labels?.jobSearchLabels as CopyOverrides | undefined,
  ) as unknown as BoardCopy['jobSearch'];
}
