import { useEffect, useState } from 'react';

import { getCompanyMarkets } from '../server/queries';

type MarketSuggestion = { slug: string; name: string };

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

export type CompanyMarketSuggestionDependencies = {
  getCompanyMarkets: (input: {
    data: { search: string; limit: number };
  }) => Promise<{
    data: Awaited<ReturnType<typeof getCompanyMarkets>>['data'];
  }>;
};

const companyMarketSuggestionDependencies: CompanyMarketSuggestionDependencies =
  { getCompanyMarkets };

export function useCompanyMarketSuggestions(
  enabled: boolean,
  dependencies: CompanyMarketSuggestionDependencies = companyMarketSuggestionDependencies,
) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MarketSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = query.trim();
    if (!enabled || search.length < MIN_QUERY) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    // Keep the previous suggestions on screen while the new (debounced) query
    // is in flight — clearing them here empties the popup on every keystroke,
    // collapsing it to a loading state and back, which reads as flicker. The
    // list is replaced in place once fresh results resolve.
    setLoading(true);
    const timer = setTimeout(() => {
      void dependencies
        .getCompanyMarkets({ data: { search, limit: 10 } })
        .then((response) => {
          if (!cancelled) {
            setSuggestions(
              response.data.map((market) => ({
                slug: market.slug,
                name: market.name,
              })),
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
