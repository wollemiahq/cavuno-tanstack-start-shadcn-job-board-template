import { useCallback, useEffect, useRef, useState } from 'react';

import { m } from '../paraglide/messages';
import { resolveLocation, searchLocations } from '../server/queries';

import {
  toGlobalLocationSuggestionVM,
  type LocationSuggestionVM,
} from '@/board/location-suggestion';
import type { LocationSuggestionState } from '@/components/location-combobox';
import type {
  LocationSearchQuery,
  LocationResolveInput,
  PublicLocation,
} from '@cavuno/board';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;
const LIMIT = 8;
const SESSION_MS = 180_000;
// The 50th suggest ends a provider session before a pick can retrieve it.
const MAX_SUGGESTS = 49;

type SearchSession = { token: string; started: number; requests: number };
type ResultBatch = {
  session: SearchSession;
  suggestions: LocationSuggestionVM[];
};

export type GlobalLocationSuggestionDependencies = {
  searchLocations: (input: {
    data: LocationSearchQuery;
  }) => Promise<{ data: PublicLocation[] }>;
  resolveLocation: (input: {
    data: LocationResolveInput;
  }) => Promise<PublicLocation>;
  newSession: () => string;
};

function newSession(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

const globalLocationSuggestionDependencies: GlobalLocationSuggestionDependencies =
  {
    searchLocations,
    resolveLocation,
    newSession,
  };

/** Worldwide suggestions and pick-time retrieval share one field session. */
export function useGlobalLocationSuggestions(
  options: { countries?: readonly string[] | null } = {},
  dependencies: GlobalLocationSuggestionDependencies = globalLocationSuggestionDependencies,
): LocationSuggestionState {
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [suggestions, setSuggestions] = useState<LocationSuggestionVM[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string>();
  const sessionRef = useRef<SearchSession | null>(null);
  const batchRef = useRef<ResultBatch | null>(null);
  const generation = useRef(0);
  const country = options.countries?.length
    ? options.countries.join(',')
    : undefined;

  useEffect(() => {
    const current = ++generation.current;
    batchRef.current = null;
    setResolving(false);
    setSuggestions([]);
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      let session = sessionRef.current;
      if (
        !session ||
        Date.now() - session.started >= SESSION_MS ||
        session.requests >= MAX_SUGGESTS
      ) {
        session = {
          token: dependencies.newSession(),
          started: Date.now(),
          requests: 0,
        };
        sessionRef.current = session;
      }
      session.requests += 1;
      const dispatchedSession = session;
      const data: LocationSearchQuery = {
        q,
        limit: LIMIT,
        session: session.token,
      };
      if (country) data.country = country;
      void dependencies
        .searchLocations({ data })
        .then((response) => {
          if (generation.current !== current) return;
          const items = response.data.map(toGlobalLocationSuggestionVM);
          batchRef.current = { session: dispatchedSession, suggestions: items };
          setSuggestions(items);
        })
        .catch(() => {
          if (generation.current !== current) return;
          setError(m.boardError_locationsUnavailableText());
        })
        .finally(() => {
          if (generation.current === current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      generation.current += 1;
      clearTimeout(timer);
    };
  }, [dependencies, country, query, refresh]);

  const onQueryChange = useCallback((text: string) => {
    generation.current += 1;
    batchRef.current = null;
    setError(undefined);
    setResolving(false);
    setQuery(text);
  }, []);

  const resolvePick = useCallback(
    async (place: LocationSuggestionVM) => {
      const batch = batchRef.current;
      if (!batch || !batch.suggestions.includes(place)) return null;
      sessionRef.current = null;
      batchRef.current = null;
      setSuggestions([]);
      if (Date.now() - batch.session.started >= SESSION_MS) {
        setError(m.locationField_pickRequiredError());
        setRefresh((value) => value + 1);
        return null;
      }
      const current = ++generation.current;
      setResolving(true);
      setLoading(true);
      setError(undefined);
      try {
        const result = await dependencies.resolveLocation({
          data: { locationId: place.id, session: batch.session.token },
        });
        if (generation.current !== current) return null;
        return toGlobalLocationSuggestionVM(result);
      } catch {
        if (generation.current === current) {
          setError(m.boardError_locationsUnavailableText());
          // A failed retrieve may already have ended the session. Refresh
          // suggestions under a new token before allowing another pick.
          setRefresh((value) => value + 1);
        }
        return null;
      } finally {
        if (generation.current === current) {
          setLoading(false);
          setResolving(false);
        }
      }
    },
    [dependencies],
  );

  return { suggestions, loading, onQueryChange, resolvePick, error, resolving };
}
