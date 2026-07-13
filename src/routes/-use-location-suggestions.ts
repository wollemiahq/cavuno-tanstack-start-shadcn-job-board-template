import { useEffect, useState } from "react";

import {
  toLocationSuggestionVM,
  type LocationSuggestionVM,
} from "@/board/location-suggestion";
import type { LocationSuggestionState } from "@/components/location-combobox";
import { searchPlaces } from "../server/queries";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

/** Route-owned controller for the presentational location combobox. */
export function useLocationSuggestions(locale: string): LocationSuggestionState {
  const [query, setQuery] = useState("");
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
      void searchPlaces({ data: { q, limit: 10 } })
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
  }, [locale, query]);

  return { suggestions, loading, onQueryChange: setQuery };
}
