import { useCallback, useEffect, useRef, useState } from 'react';

import { searchPlaces } from '../server/queries';

import {
  toLocationSuggestionVM,
  type LocationSuggestionVM,
} from '@/board/location-suggestion';
import type { LocationSearchState } from '@/components/location-combobox';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;
const LIMIT = 10;

export type LocationSuggestionDependencies = {
  searchPlaces: (input: {
    data: { q: string; limit: number };
  }) => Promise<{ data: Awaited<ReturnType<typeof searchPlaces>>['data'] }>;
};

const locationSuggestionDependencies: LocationSuggestionDependencies = {
  searchPlaces,
};

/**
 * Route-owned controller for the presentational location combobox: board
 * places (only places the board's jobs use) for the jobs location filter.
 */
export function useLocationSuggestions(
  locale: string,
  dependencies: LocationSuggestionDependencies = locationSuggestionDependencies,
): LocationSearchState {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    query: string;
    suggestions: LocationSuggestionVM[];
  }>({ query: '', suggestions: [] });
  const [loading, setLoading] = useState(false);
  // What `resolve` reads: the text the current suggestions answer. State
  // alone would hand a stale closure to a submit that follows a keystroke.
  const resultsRef = useRef(results);

  const load = useCallback(
    async (q: string) => {
      const response = await dependencies.searchPlaces({
        data: { q, limit: LIMIT },
      });
      return response.data.flatMap((place) => {
        const suggestion = toLocationSuggestionVM(place, locale);
        return suggestion ? [suggestion] : [];
      });
    },
    [dependencies, locale],
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      resultsRef.current = { query: q, suggestions: [] };
      setResults(resultsRef.current);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void load(q)
        .then((suggestions) => {
          if (cancelled) return;
          resultsRef.current = { query: q, suggestions };
          setResults(resultsRef.current);
        })
        .catch(() => {
          // A failed suggest leaves the field usable; a submit retries.
          if (cancelled) return;
          resultsRef.current = { query: '', suggestions: [] };
          setResults(resultsRef.current);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [load, query]);

  /**
   * The top board place for typed text the visitor never picked: the
   * current first suggestion when it answers exactly that text, else one
   * request. `null` when the board has no jobs in any matching place.
   */
  const resolve = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (q.length < MIN_QUERY) return null;
      if (resultsRef.current.query === q) {
        return resultsRef.current.suggestions[0] ?? null;
      }
      try {
        return (await load(q))[0] ?? null;
      } catch {
        return null;
      }
    },
    [load],
  );

  return {
    suggestions: results.suggestions,
    loading,
    onQueryChange: setQuery,
    resolve,
  };
}
