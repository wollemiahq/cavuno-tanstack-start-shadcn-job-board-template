import { useEffect, useState } from 'react';

import { getCompanyMarkets } from '../server/queries';

type MarketSuggestion = { slug: string; name: string };

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

export function useCompanyMarketSuggestions(enabled: boolean) {
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
    setSuggestions([]);
    setLoading(true);
    const timer = setTimeout(() => {
      void getCompanyMarkets({ data: { search, limit: 10 } })
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
  }, [enabled, query]);

  return { suggestions, loading, onQueryChange: setQuery };
}
