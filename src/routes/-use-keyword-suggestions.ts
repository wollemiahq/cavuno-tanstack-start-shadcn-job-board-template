import { useEffect, useState } from 'react';

import { searchTaxonomySuggestions } from '../server/queries';

import {
  dedupeKeywordSuggestions,
  toKeywordSuggestionVM,
} from '@/board/keyword-suggestion';
import type { KeywordSuggestionState } from '@/components/keyword-combobox';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

export type KeywordSuggestionDependencies = {
  searchTaxonomySuggestions: (input: {
    data: { q: string; limit: number };
  }) => Promise<{
    data: Awaited<ReturnType<typeof searchTaxonomySuggestions>>['data'];
  }>;
};

const keywordSuggestionDependencies: KeywordSuggestionDependencies = {
  searchTaxonomySuggestions,
};

/** Route-owned controller for the Jobs category/skill autocomplete. */
export function useKeywordSuggestions(
  enabled: boolean,
  dependencies: KeywordSuggestionDependencies = keywordSuggestionDependencies,
): KeywordSuggestionState {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    KeywordSuggestionState['suggestions']
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < MIN_QUERY) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void dependencies
        .searchTaxonomySuggestions({ data: { q, limit: 10 } })
        .then((response) => {
          if (!cancelled) {
            setSuggestions(
              dedupeKeywordSuggestions(
                response.data.map(toKeywordSuggestionVM),
              ),
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
  }, [dependencies, enabled, query]);

  return { suggestions, loading, onQueryChange: setQuery };
}
