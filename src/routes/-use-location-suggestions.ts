import { useCallback, useEffect, useRef, useState } from 'react';

import {
  searchPlaces,
  searchTalentPlaces,
  suggestPlaces,
} from '../server/queries';

import {
  suggestionsBeyondBoardPlaces,
  toLocationSuggestionVM,
  toSuggestedPlaceVM,
  toTalentPlaceSuggestionVM,
  type LocationSuggestionVM,
} from '@/board/location-suggestion';
import type { LocationSearchState } from '@/components/location-combobox';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;
const LIMIT = 10;
/** Suggested places listed after the board's own (the API default). */
const SUGGEST_LIMIT = 5;
/** The board's own places never wait longer than this for suggestions. */
const SUGGEST_WAIT_MS = 800;

/** Which place list feeds the field: job places or candidate places. */
export type LocationSuggestionSource = 'jobs' | 'talent';

export type LocationSuggestionDependencies = {
  searchPlaces: (input: {
    data: { q: string; limit: number };
  }) => Promise<{ data: Awaited<ReturnType<typeof searchPlaces>>['data'] }>;
  searchTalentPlaces: (input: {
    data: { q: string; limit: number };
  }) => Promise<{
    data: Awaited<ReturnType<typeof searchTalentPlaces>>['data'];
  }>;
  suggestPlaces: (input: {
    data: { q: string; limit: number };
  }) => Promise<{ data: Awaited<ReturnType<typeof suggestPlaces>>['data'] }>;
};

const locationSuggestionDependencies: LocationSuggestionDependencies = {
  searchPlaces,
  searchTalentPlaces,
  suggestPlaces,
};

export type LocationSuggestionOptions = {
  /**
   * The board context's `features.placeSuggestions`: the `jobs` field also
   * suggests any town, city or neighbourhood after the board's places.
   */
  placeSuggestions?: boolean;
};

/**
 * Route-owned controller for the presentational location combobox. `jobs`
 * suggests board places (only places the board's jobs use) for the jobs
 * location filter, followed by any other matching place when
 * `placeSuggestions` is on; `talent` suggests the places directory
 * candidates live in, for the `/talent` `place` filter.
 */
export function useLocationSuggestions(
  locale: string,
  source: LocationSuggestionSource = 'jobs',
  { placeSuggestions = false }: LocationSuggestionOptions = {},
  dependencies: LocationSuggestionDependencies = locationSuggestionDependencies,
): LocationSearchState {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    source: LocationSuggestionSource;
    query: string;
    suggestions: LocationSuggestionVM[];
  }>({ source, query: '', suggestions: [] });
  const [loading, setLoading] = useState(false);
  // What `resolve` reads: the text the current suggestions answer. State
  // alone would hand a stale closure to a submit that follows a keystroke.
  const resultsRef = useRef(results);

  const load = useCallback(
    async (q: string) => {
      const data = { q, limit: LIMIT };
      const present = (
        suggestions: (LocationSuggestionVM | null)[],
      ): LocationSuggestionVM[] =>
        suggestions.filter(
          (suggestion): suggestion is LocationSuggestionVM =>
            suggestion !== null,
        );
      if (source === 'jobs' && placeSuggestions) {
        // Both lists at once. A failed suggest costs only the extra places;
        // the board's own still show and still resolve typed text.
        const [boardPlaces, suggested] = await Promise.all([
          dependencies.searchPlaces({ data }),
          Promise.race([
            dependencies
              .suggestPlaces({ data: { q, limit: SUGGEST_LIMIT } })
              .then(
                ({ data: places }) => places,
                () => [],
              ),
            new Promise<[]>((done) => setTimeout(() => done([]), SUGGEST_WAIT_MS)),
          ]),
        ]);
        // The board's places first, then the suggestions that are not one
        // of them; `resolve` takes the first of this merged list.
        return present([
          ...boardPlaces.data.map((place) =>
            toLocationSuggestionVM(place, locale),
          ),
          ...suggestionsBeyondBoardPlaces(boardPlaces.data, suggested).map(
            (place) => toSuggestedPlaceVM(place, locale),
          ),
        ]);
      }
      if (source === 'jobs') {
        return present(
          (await dependencies.searchPlaces({ data })).data.map((place) =>
            toLocationSuggestionVM(place, locale),
          ),
        );
      }
      // Candidate places first. A restricted directory rejects the list and
      // one whose counts are not built yet returns none; job places (by their
      // English slug, the `place` filter) then keep typed text resolvable and
      // let a radius search start from a place with no candidates of its own.
      const talentPlaces = await dependencies.searchTalentPlaces({ data }).then(
        ({ data: places }) =>
          present(
            places.map((place) => toTalentPlaceSuggestionVM(place, locale)),
          ),
        () => [],
      );
      if (talentPlaces.length > 0) return talentPlaces;
      return present(
        (await dependencies.searchPlaces({ data })).data.map((place) =>
          toTalentPlaceSuggestionVM(place, locale),
        ),
      );
    },
    [dependencies, locale, placeSuggestions, source],
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      resultsRef.current = { source, query: q, suggestions: [] };
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
          resultsRef.current = { source, query: q, suggestions };
          setResults(resultsRef.current);
        })
        .catch(() => {
          // A failed suggest leaves the field usable; a submit retries.
          if (cancelled) return;
          resultsRef.current = { source, query: '', suggestions: [] };
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
  }, [load, query, source]);

  /**
   * The top place for typed text the visitor never picked: the current
   * first suggestion when it answers exactly that text, else one load.
   * `null` when no listed place matches.
   */
  const resolve = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (q.length < MIN_QUERY) return null;
      if (
        resultsRef.current.source === source &&
        resultsRef.current.query === q
      ) {
        return resultsRef.current.suggestions[0] ?? null;
      }
      try {
        return (await load(q))[0] ?? null;
      } catch {
        return null;
      }
    },
    [load, source],
  );

  return {
    // Suggestions for the other list (the scope just changed) are stale.
    suggestions: results.source === source ? results.suggestions : [],
    loading,
    onQueryChange: setQuery,
    resolve,
  };
}
