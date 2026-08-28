import { m } from '../paraglide/messages';

export function jobSearchCopy() {
  return {
    allFiltersLabel: m.jobSearch_allFiltersLabel(),
    anyTypeLabel: m.jobSearch_anyTypeLabel(),
    anyWorkplaceLabel: m.jobSearch_anyWorkplaceLabel(),
    applyFiltersLabel: m.jobSearch_applyFiltersLabel(),
    cancelLabel: m.jobSearch_cancelLabel(),
    clearFiltersLabel: m.jobSearch_clearFiltersLabel(),
    contextualResultsHeading: m.jobSearch_contextualResultsHeading({
      count: '{{count}}',
      heading: '{{heading}}',
    }),
    detailErrorTitle: m.jobSearch_detailErrorTitle(),
    detailLoadingLabel: m.jobSearch_detailLoadingLabel(),
    filterSheetDescription: m.jobSearch_filterSheetDescription(),
    filteredEmptyText: m.jobSearch_filteredEmptyText(),
    filtersLabel: m.jobSearch_filtersLabel(),
    gatedCountText: m.jobSearch_gatedCountText({ count: '{{count}}' }),
    headingJobs: m.jobSearch_headingJobs(),
    initialEmptyText: m.jobSearch_initialEmptyText(),
    keywordLabel: m.jobSearch_keywordLabel(),
    keywordPlaceholder: m.jobSearch_keywordPlaceholder(),
    loadMoreLabel: m.jobSearch_loadMoreLabel(),
    locationLabel: m.jobSearch_locationLabel(),
    locationPlaceholder: m.jobSearch_locationPlaceholder(),
    noJobsMatchText: m.jobSearch_noJobsMatchText(),
    noMatchingResultsHeading: m.jobSearch_noMatchingResultsHeading(),
    queryEmptyText: m.jobSearch_queryEmptyText(),
    resetFiltersAction: m.jobSearch_resetFiltersAction(),
    resetLabel: m.jobSearch_resetLabel(),
    // One field per catalog key (the adapter's contract). The plural category
    // is chosen inside the message against the active locale, so this exposes
    // the general form; the real call sites pass the actual number and get the
    // right category, including languages with more than two forms.
    // `count: 0` resolves to the catch-all arm (`other` in en/de/fr/es, `many`
    // in pl) — the closest thing to a general form. Asking for 2 would bake a
    // SPECIFIC category in any language with a `few`/`two` arm, so a `{{count}}`
    // of 5 would render the wrong Polish form.
    resultsCount: m.jobSearch_resultsCount({
      count: 0,
      countLabel: '{{count}}',
    }),
    resultsRegionLabel: m.jobSearch_resultsRegionLabel(),
    resultsShowingRange: m.jobSearch_resultsShowingRange({
      from: '{{from}}',
      to: '{{to}}',
      count: '{{count}}',
    }),
    retryLabel: m.jobSearch_retryLabel(),
    searchButtonLabel: m.jobSearch_searchButtonLabel(),
    selectedJobRegionLabel: m.jobSearch_selectedJobRegionLabel(),
    seniorityPlaceholder: m.jobSearch_seniorityPlaceholder(),
    senioritySelectedCount: m.jobSearch_senioritySelectedCount({
      count: '{{count}}',
    }),
    sortPlaceholder: m.jobSearch_sortPlaceholder(),
    typePlaceholder: m.jobSearch_typePlaceholder(),
    unlockMoreLabel: m.jobSearch_unlockMoreLabel(),
    viewFullJobLabel: m.jobSearch_viewFullJobLabel(),
    workplacePlaceholder: m.jobSearch_workplacePlaceholder(),
  };
}
