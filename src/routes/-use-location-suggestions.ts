import { useEffect, useState } from 'react';

import { searchPlaces } from '../server/queries';

import {
  toLocationSuggestionVM,
  type LocationSuggestionVM,
} from '@/board/location-suggestion';
import type { LocationSuggestionState } from '@/components/location-combobox';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

export type LocationSuggestionDependencies = {
  searchPlaces: (input: {
    data: { q: string; limit: number };
  }) => Promise<{ data: Awaited<ReturnType<typeof searchPlaces>>['data'] }>;
};

const locationSuggestionDependencies: LocationSuggestionDependencies = {
  searchPlaces,
};

/** Route-owned controller for the presentational location combobox. */
export function useLocationSuggestions(
  locale: string,
  dependencies: LocationSuggestionDependencies = locationSuggestionDependencies,
): LocationSuggestionState {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestionVM[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void dependencies
        .searchPlaces({ data: { q, limit: 10 } })
        .then((response) => {
          if (!cancelled) {
            setSuggestions(
              response.data.flatMap((place) => {
                const suggestion = toLocationSuggestionVM(place, locale);
                return suggestion ? [suggestion] : [];
              }),
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dependencies, locale, query]);

  return { suggestions, loading, onQueryChange: setQuery };
}
