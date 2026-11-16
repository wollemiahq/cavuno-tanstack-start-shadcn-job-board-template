import { renderToString } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import {
  resolveHeaderSearchState,
  type HeaderSearchScope,
} from '../lib/header-search';
import { HeaderSearchEnhanced } from './header-search-enhanced';

/**
 * The server must render the header search fields without suspending. A
 * server-side React.lazy caches its import() promise in module scope; on
 * Workers, a request that ends while it is pending (a HEAD) leaves it
 * unsettled forever, and every later render in the isolate hangs on it.
 * renderToString shows the Suspense fallback for anything that suspends, so
 * a fallback here means the server is loading a field lazily again.
 */
const paths = {
  jobs: '/jobs',
  companies: '/companies',
  blog: '/blog',
  talent: '/talent',
} satisfies Partial<Record<HeaderSearchScope, string>>;

const suggestions = () => ({
  suggestions: [],
  loading: false,
  onQueryChange: vi.fn(),
});

describe('header search on the server', () => {
  it.each(Object.entries(paths))(
    'renders the %s fields without suspending',
    (scope, path) => {
      const state = resolveHeaderSearchState(path, {});
      expect(state.scope).toBe(scope);
      const html = renderToString(
        <HeaderSearchEnhanced
          search={{
            ...state,
            onSubmit: vi.fn(),
            keywordSuggestions: suggestions(),
            blogSuggestions: suggestions(),
            companyMarketSuggestions: suggestions(),
            locationSuggestions: {
              ...suggestions(),
              resolve: async () => null,
            },
          }}
          fields={{
            value: '',
            setValue: vi.fn(),
            location: null,
            setLocation: vi.fn(),
            term: null,
            setTerm: vi.fn(),
            market: null,
            setMarket: vi.fn(),
          }}
          jobsPlaceholder="jobs-placeholder"
          companiesPlaceholder="companies-placeholder"
          talentPlaceholder="talent-placeholder"
          blogPlaceholder="blog-placeholder"
          productsPlaceholder="products-placeholder"
        />,
      );
      expect(html).not.toContain('header-search-fallback');
      expect(html).toContain(`${scope}-placeholder`);
    },
  );
});
