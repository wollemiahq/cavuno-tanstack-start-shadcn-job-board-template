'use client';

import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import { ListingSearchBand } from '@/components/board/listing-page-header';
import {
  LocationCombobox,
  type LocationSuggestionState,
} from '@/components/location-combobox';

/**
 * The company-jobs subpage search (CAV-501, CAV-511) — a thin wrapper of the
 * shared `ListingSearchBand`, so it is the SAME white panel the jobs,
 * companies, and blog headers use (no duplicate search-band markup). Scoped to
 * ONE company: it submits to that company's jobs subpage
 * (`/companies/$companySlug/jobs?q=&location=`), backed by the jobs SEARCH
 * endpoint with a `companyId` filter, or the BROWSE list when there is no
 * keyword. Submitting a fresh search drops `?page=`, resetting to page 1.
 *
 * Location rides the band's `leadingSlot` — the same slot and the same
 * `LocationCombobox` the site header uses. The API's location filter is a geo
 * radius keyed by PLACE SLUG, so only a resolved suggestion is submittable;
 * the display name rides alongside as `locationName` purely so a cold load
 * rehydrates the input's text.
 */
export function CompanyJobsSearchBar({
  companySlug,
  defaultValue,
  location,
  locationSuggestions,
}: {
  companySlug: string;
  defaultValue?: string;
  /** The place currently filtering results, read back from the URL. */
  location?: { slug: string; name?: string } | null;
  /** Route-owned suggestion controller (`useLocationSuggestions`). */
  locationSuggestions: LocationSuggestionState;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(defaultValue ?? '');
  const [place, setPlace] = useState<{ slug: string; name: string } | null>(
    location?.slug ? { slug: location.slug, name: location.name ?? '' } : null,
  );

  /** `undefined` keeps the current place; `null` clears it. */
  const submit = (next?: { slug: string; name: string } | null) => {
    const target = next === undefined ? place : next;
    void navigate({
      to: '/companies/$companySlug/jobs',
      params: { companySlug },
      search: {
        q: query || undefined,
        location: target?.slug || undefined,
        locationName: target?.name || undefined,
      },
    });
  };

  return (
    <ListingSearchBand
      value={query}
      onChange={setQuery}
      onSubmit={() => submit()}
      placeholder={m.companyJobs_searchPlaceholderText()}
      inputAriaLabel={m.searchBar_keywordAriaLabel()}
      searchLabel={m.searchBar_searchLabel()}
      searchAriaLabel={m.searchBar_searchAriaLabel()}
      leadingSlot={
        <LocationCombobox
          {...locationSuggestions}
          value={place?.slug}
          valueLabel={place?.name}
          onSelect={(next) => {
            setPlace(next);
            // A place is only ever a resolved suggestion, so apply it right
            // away — same behaviour as the site header's location field.
            submit(next);
          }}
          onClear={() => {
            setPlace(null);
            submit(null);
          }}
          className="border-border bg-input/50 h-9 min-w-0 lg:min-w-56 lg:flex-1"
        />
      }
    />
  );
}
