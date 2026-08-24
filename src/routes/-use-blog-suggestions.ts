import { useEffect, useState } from 'react';

import { searchBlogSuggestions } from '../server/queries';

import {
  sortBlogSuggestions,
  toBlogSuggestionVM,
} from '@/board/keyword-suggestion';
import type { KeywordSuggestionState } from '@/components/keyword-combobox';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

export type BlogSuggestionDependencies = {
  searchBlogSuggestions: (input: {
    data: { q: string; limit: number };
  }) => Promise<{
    data: Awaited<ReturnType<typeof searchBlogSuggestions>>['data'];
  }>;
};

const blogSuggestionDependencies: BlogSuggestionDependencies = {
  searchBlogSuggestions,
};

/** Route-owned controller for the blog post/tag autocomplete (ADR-0102). */
export function useBlogSuggestions(
  enabled: boolean,
  dependencies: BlogSuggestionDependencies = blogSuggestionDependencies,
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
        .searchBlogSuggestions({ data: { q, limit: 10 } })
        .then((response) => {
          if (!cancelled) {
            setSuggestions(
              sortBlogSuggestions(response.data.map(toBlogSuggestionVM)),
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
