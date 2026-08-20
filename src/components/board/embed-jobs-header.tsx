'use client';

import { useState } from 'react';

import {
  EMPLOYMENT_TYPES,
  REMOTE_OPTIONS,
  SENIORITIES,
  type ListingFilters,
} from '@cavuno/board/filters';
import { Link, useRouter } from '@tanstack/react-router';
import { Search } from 'lucide-react';

import { m } from '../../paraglide/messages';

import { JobsFilterToolbar } from '@/components/board/jobs-filter-toolbar';
import { KeywordCombobox } from '@/components/keyword-combobox';
import { LocationCombobox } from '@/components/location-combobox';
import { Button } from '@/components/ui/button';
import { jobSearchCopy } from '@/copy-groups/job-search';
import { enumLabel, seniorityLabelMap } from '@/lib/enum-labels';
import type {
  HeaderSearchLocation,
  HeaderSearchTerm,
} from '@/lib/header-search';
import { hideBrokenImage } from '@/lib/hide-broken-image';
import { resolveJobsSearchTarget } from '@/lib/jobs-search-target';
import { useKeywordSuggestions } from '@/routes/-use-keyword-suggestions';
import { useLocationSuggestions } from '@/routes/-use-location-suggestions';

/**
 * Embed widget chrome: board identity, then keyword + location + filters +
 * Search on ONE line (the hosted widget's shape — a bare row, not the
 * `ListingSearchBand` panel the full-page listings sit in; the embed is a
 * fragment inside somebody else's page and cannot afford a second row of
 * chrome). Filters collapse to a single icon trigger for the same reason.
 *
 * Search is staged, never live: typing, picking a suggestion and changing a
 * filter only set local state; ONLY the explicit Search button acts, and it
 * opens a new tab rather than navigating the iframe (hosted ADR-0051).
 * `noopener` but deliberately not `noreferrer`, so the opened board keeps the
 * `/embed/jobs` referrer for attribution.
 */
export function EmbedJobsHeader({
  boardName,
  logoUrl,
  locale,
}: {
  boardName: string;
  logoUrl: string | null;
  locale: string;
}) {
  const router = useRouter();
  const keywordSuggestions = useKeywordSuggestions(true);
  const locationSuggestions = useLocationSuggestions(locale);
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState<HeaderSearchTerm | null>(null);
  const [location, setLocation] = useState<HeaderSearchLocation | null>(null);
  const [filters, setFilters] = useState<{
    remoteOption?: ListingFilters['remoteOption'];
    employmentType?: ListingFilters['employmentType'];
    seniority?: ListingFilters['seniority'];
  }>({});
  const copy = { jobSearch: jobSearchCopy() };
  const seniorityLabel = seniorityLabelMap(SENIORITIES);

  const launch = () => {
    const target = resolveJobsSearchTarget({
      query: query.trim() || undefined,
      location,
      term,
      filters,
    });
    window.open(router.buildLocation(target).href, '_blank', 'noopener');
  };

  return (
    <form
      data-test="embed-jobs-header"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        launch();
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
            onApply={(value) =>
              setFilters({
                remoteOption: value.workplace as ListingFilters['remoteOption'],
                employmentType:
                  value.employmentType as ListingFilters['employmentType'],
                seniority: value.seniority as ListingFilters['seniority'],
              })
            }
            onReset={() => setFilters({})}
          />

          <Button
            type="submit"
            size="lg"
            aria-label={m.searchBar_searchAriaLabel()}
            className="flex-1 justify-center sm:flex-none"
          >
            <Search aria-hidden="true" />
            {m.searchBar_searchLabel()}
          </Button>
        </div>
      </div>
    </form>
  );
}
