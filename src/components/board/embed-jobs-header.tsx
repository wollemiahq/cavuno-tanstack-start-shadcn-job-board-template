'use client';

import { useRef, useState } from 'react';

import {
  EMPLOYMENT_TYPES,
  REMOTE_OPTIONS,
  SENIORITIES,
  type ListingFilters,
} from '@cavuno/board/filters';
import { Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { JobsFilterToolbar } from '@/components/board/jobs-filter-toolbar';
import {
  KeywordCombobox,
  type KeywordSuggestionState,
} from '@/components/keyword-combobox';
import {
  LocationCombobox,
  type LocationSuggestionState,
} from '@/components/location-combobox';
import { buttonVariants } from '@/components/ui/button';
import { jobSearchCopy } from '@/copy-groups/job-search';
import { enumLabel, seniorityLabelMap } from '@/lib/enum-labels';
import type {
  HeaderSearchLocation,
  HeaderSearchTerm,
} from '@/lib/header-search';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import {
  resolveJobsSearchTarget,
  type JobsSearchFilters,
} from '@/lib/jobs-search-target';
import { cn } from '@/lib/utils';

/**
 * Embed widget chrome: board identity, then keyword + location + filters +
 * Search on ONE line (the hosted widget's shape — a bare row, not the
 * `ListingSearchBand` panel the full-page listings sit in; the embed is a
 * fragment inside somebody else's page and cannot afford a second row of
 * chrome). Filters collapse to a single icon trigger for the same reason.
 *
 * Search is staged, never live: typing, picking a suggestion and changing a
 * filter only set local state; ONLY the explicit Search control acts. It is a
 * `Link` with `target="_blank"`, not a `window.open` — an anchor opens a real
 * tab, survives popup blockers, and gives the control a middle-clickable href,
 * where a feature-string `window.open` forces popup-window semantics. Either
 * way the iframe itself never navigates (hosted ADR-0051).
 *
 * The controls seed from the widget's OWN query params, so an operator who
 * scopes the iframe (`?query=nurse&remoteOption=remote`) gets a header that
 * agrees with the list beneath it, and a Search that keeps that scope instead
 * of silently opening the unfiltered board.
 *
 * `noopener` without `noreferrer` HERE, so the board keeps the `/embed/jobs`
 * referrer for attribution on this control and the identity link. The job
 * cards below use `noreferrer` (hosted parity) and do not.
 */
export function EmbedJobsHeader({
  boardName,
  logoUrl,
  initialSearch,
  keywordSuggestions,
  locationSuggestions,
}: {
  boardName: string;
  logoUrl: string | null;
  /**
   * The widget's own query params. `location` is a place SLUG (the API's geo
   * filter is keyed by slug), and the embed URL carries no companion display
   * name, so the field shows the slug until the visitor picks a suggestion —
   * the same limitation `CompanyJobsSearchBar` documents.
   */
  initialSearch: {
    q?: string;
    location?: string;
  } & JobsSearchFilters;
  /** Route-owned suggestion controllers (`useKeywordSuggestions` / `useLocationSuggestions`). */
  keywordSuggestions: KeywordSuggestionState;
  locationSuggestions: LocationSuggestionState;
}) {
  const [query, setQuery] = useState(initialSearch.q ?? '');
  const [term, setTerm] = useState<HeaderSearchTerm | null>(null);
  const [location, setLocation] = useState<HeaderSearchLocation | null>(
    initialSearch.location
      ? { slug: initialSearch.location, name: initialSearch.location }
      : null,
  );
  const [filters, setFilters] = useState<JobsSearchFilters>({
    remoteOption: initialSearch.remoteOption,
    // `volunteer` and `other` are wire values the embed's own list can filter
    // on, but they are NOT in the listing filter vocabulary, so the /jobs
    // destination drops them. Staging one would light the badge and populate
    // no Type option, over a Search that opens the unfiltered board — the
    // exact thing this header promises not to do.
    // SAFETY: The include check proves the embed query's raw employment type
    // is one of the public listing filter members before staging it.
    employmentType: EMPLOYMENT_TYPES.includes(
      initialSearch.employmentType as (typeof EMPLOYMENT_TYPES)[number],
    )
      ? initialSearch.employmentType
      : undefined,
    seniority: initialSearch.seniority,
  });
  const copy = { jobSearch: jobSearchCopy() };
  const seniorityLabel = seniorityLabelMap(SENIORITIES);
  const searchRef = useRef<HTMLAnchorElement>(null);

  // Pure function of staged state, so the Search control can be a real anchor
  // with an href rather than a click handler.
  const target = resolveJobsSearchTarget({
    query: query.trim() || undefined,
    location,
    term,
    filters,
  });

  return (
    <div
      data-test="embed-jobs-header"
      role="search"
      // Enter searches, as it does in any two-field search widget — but ONLY
      // from the two text inputs. This listener sits on the container so both
      // are covered, which also puts it in the bubble path of every button and
      // link in the header (and, through the React tree, the portalled filter
      // Sheet); without the role check it cancelled their activation and
      // searched instead, leaving them keyboard-dead.
      //
      // It is deliberately NOT a <form>: a native submit fires before
      // hydration and would reload the iframe with the operator's params
      // dropped.
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        // Only the two TEXT FIELDS may search. Buttons and links activate on
        // Enter by DEFAULT — they never call preventDefault — so
        // `defaultPrevented` cannot tell them apart, and `role="combobox"`
        // alone does not either: Base UI renders a Select trigger as
        // `<button role="combobox">`, which is what the Workplace and Type
        // selects inside the filter Sheet are.
        if (
          !(event.target instanceof HTMLInputElement) ||
          event.target.getAttribute('role') !== 'combobox'
        ) {
          return;
        }
        // The combobox marks Enter handled when it is selecting a highlighted
        // suggestion; an IME is mid-composition when Enter commits a
        // candidate; and a held key repeats.
        if (
          event.defaultPrevented ||
          event.repeat ||
          event.nativeEvent.isComposing
        ) {
          return;
        }

        event.preventDefault();
        searchRef.current?.click();
      }}
      className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4"
    >
      <Link
        to="/"
        target="_blank"
        rel="noopener"
        className="flex min-w-0 shrink-0 items-center gap-3 font-medium no-underline transition hover:opacity-80"
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            width={32}
            height={32}
            className="border-border size-8 shrink-0 rounded-md border object-cover"
            onError={hideBrokenImage}
          />
        ) : null}
        <span className="font-heading truncate">{boardName}</span>
      </Link>

      <div className="bg-border hidden w-px self-stretch lg:block" />

      <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <KeywordCombobox
            {...keywordSuggestions}
            value={query}
            placeholder={m.jobSearch_keywordPlaceholder()}
            onValueChange={(next) => {
              setQuery(next);
              setTerm(null);
            }}
            onSelect={(suggestion) => {
              setQuery(suggestion.name);
              setTerm(
                suggestion.type === 'skill' || suggestion.type === 'category'
                  ? {
                      type: suggestion.type,
                      slug: suggestion.slug,
                      name: suggestion.name,
                    }
                  : null,
              );
            }}
            onClear={() => setTerm(null)}
            className="border-border bg-input/50 h-9 min-w-0"
          />
        </div>

        <div className="min-w-0 flex-1">
          <LocationCombobox
            {...locationSuggestions}
            value={location?.slug}
            valueLabel={location?.name}
            onSelect={setLocation}
            onClear={() => setLocation(null)}
            className="border-border bg-input/50 h-9 min-w-0 flex-1"
          />
        </div>

        {/* Filter + Search share a row so the icon trigger never orphans onto
            its own line above a full-width Search on mobile. */}
        <div className="flex shrink-0 items-center gap-2">
          <JobsFilterToolbar
            variant="compact"
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
            onApply={(value) => {
              const nextFilters: JobsSearchFilters = {
                // SAFETY: JobsFilterToolbar options are built from REMOTE_OPTIONS.
                remoteOption: value.workplace as ListingFilters['remoteOption'],
                // SAFETY: JobsFilterToolbar options are built from EMPLOYMENT_TYPES.
                employmentType:
                  value.employmentType as ListingFilters['employmentType'],
                // SAFETY: JobsFilterToolbar seniority options are built from SENIORITIES.
                seniority: value.seniority as ListingFilters['seniority'],
              };
              setFilters(nextFilters);
            }}
            onReset={() => setFilters({})}
          />

          <Link
            {...target}
            ref={searchRef}
            target="_blank"
            rel="noopener"
            aria-label={m.searchBar_searchAriaLabel()}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'flex-1 justify-center no-underline sm:flex-none',
            )}
          >
            <Search aria-hidden="true" />
            {m.searchBar_searchLabel()}
          </Link>
        </div>
      </div>
    </div>
  );
}
