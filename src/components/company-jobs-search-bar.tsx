'use client';

import { lazy, Suspense, useRef, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { m } from '../paraglide/messages';

import { ListingSearchBand } from '@/components/board/listing-search-band';
import type {
  LocationComboboxHandle,
  LocationSearchState,
} from '@/components/location-combobox';

// Location combobox pulls places suggest + popover UI — keep it off the
// company-jobs critical module graph until the field is needed.
const LazyLocationCombobox = lazy(() =>
  import('@/components/location-combobox').then(({ LocationCombobox }) => ({
    default: LocationCombobox,
  })),
);

/**
 * Company-scoped keyword and location search. Submitting resets pagination;
 * location changes apply immediately. Only resolved place slugs are sent to
 * the API, with locationName retained in the URL to restore the field label;
 * location text typed but not picked resolves to its top place on submit.
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
  locationSuggestions: LocationSearchState;
}) {
  const navigate = useNavigate();
  const locationRef = useRef<LocationComboboxHandle>(null);
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
      onSubmit={() => {
        const field = locationRef.current;
        if (!field?.hasPendingText()) {
          submit();
          return;
        }
        void field.resolvePending().then((pending) => {
          if (pending.kind === 'unmatched' || pending.kind === 'cancelled')
            return;
          if (pending.kind === 'resolved') {
            setPlace(pending.place);
            submit(pending.place);
            return;
          }
          submit();
        });
      }}
      placeholder={m.companyJobs_searchPlaceholderText()}
      inputAriaLabel={m.searchBar_keywordAriaLabel()}
      searchLabel={m.searchBar_searchLabel()}
      searchAriaLabel={m.searchBar_searchAriaLabel()}
      leadingSlot={
        <Suspense
          fallback={
            <span
              aria-hidden="true"
              className="border-border bg-input/50 h-9 min-w-0 rounded-2xl border lg:min-w-56 lg:flex-1"
            />
          }
        >
          <LazyLocationCombobox
            {...locationSuggestions}
            ref={locationRef}
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
        </Suspense>
      }
    />
  );
}
