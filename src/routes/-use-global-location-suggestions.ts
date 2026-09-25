import { useCallback, useEffect, useRef, useState } from 'react';

import { searchLocations } from '../server/queries';

import type { LocationSearchQuery, PublicLocation } from '@cavuno/board';

import {
  toGlobalLocationSuggestionVM,
  type LocationSuggestionVM,
} from '@/board/location-suggestion';
import type { LocationSuggestionState } from '@/components/location-combobox';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;
const LIMIT = 8;

export type GlobalLocationSuggestionDependencies = {
  searchLocations: (input: {
    data: LocationSearchQuery;
  }) => Promise<{ data: PublicLocation[] }>;
  newSession: () => string;
};

/**
 * An opaque search-session id. `randomUUID` exists only in secure contexts,
 * so a board opened over plain http on a LAN address falls back to random
 * bytes rather than crashing the field.
 */
function newSession(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

const globalLocationSuggestionDependencies: GlobalLocationSuggestionDependencies =
  { searchLocations, newSession };

/**
 * Route-owned controller for location inputs that must commit a real place
 * anywhere in the world (job office locations, candidate locations), over
 * `board.locations.search`. `countries` narrows suggestions to the job
 * form's allowed countries.
 *
 * One search session spans a field interaction: it starts with the first
 * request and ends when a result is picked (`onPicked`), so the next
 * interaction starts a new one.
 */
export function useGlobalLocationSuggestions(
  options: { countries?: readonly string[] | null } = {},
  dependencies: GlobalLocationSuggestionDependencies = globalLocationSuggestionDependencies,
): LocationSuggestionState {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestionVM[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const country = options.countries?.length
    ? options.countries.join(',')
    : undefined;

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
      sessionRef.current ??= dependencies.newSession();
      void dependencies
        .searchLocations({
          data: {
            q,
            limit: LIMIT,
            session: sessionRef.current,
            ...(country ? { country } : {}),
          },
        })
        .then((response) => {
          if (!cancelled) {
            setSuggestions(response.data.map(toGlobalLocationSuggestionVM));
          }
        })
        .catch(() => {
          // An outage (`locations_unavailable`) leaves nothing to pick; the
          // next keystroke retries.
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dependencies, country, query]);

  const onPicked = useCallback(() => {
    sessionRef.current = null;
  }, []);

  return { suggestions, loading, onQueryChange: setQuery, onPicked };
}
