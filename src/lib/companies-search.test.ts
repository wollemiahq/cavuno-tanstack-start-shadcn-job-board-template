import { describe, expect, it } from 'vitest';

import {
  companiesListingLoaderDeps,
  includeSelectedCompanyMarket,
  parseCompaniesSearch,
} from './companies-search';

describe('parseCompaniesSearch', () => {
  it('keeps only the company listing query, unified page, and selected company', () => {
    expect(
      parseCompaniesSearch({
        query: 'venture capital',
        page: '3',
        selectedCompany: 'acme-ventures',
        q: 'job-only query',
        remoteOption: 'remote',
      }),
    ).toEqual({
      query: 'venture capital',
      page: 3,
      selectedCompany: 'acme-ventures',
    });
  });

  it('collapses page 1 to a clean URL and rejects invalid page values', () => {
    // Both browse and search are offset-paginated with one 1-based `?page=`;
    // page 1 drops from the URL, and anything invalid collapses to page 1.
    expect(parseCompaniesSearch({ query: 'acme', page: '1' })).toEqual({
      query: 'acme',
      page: undefined,
      selectedCompany: undefined,
    });
    expect(parseCompaniesSearch({ page: '0' }).page).toBeUndefined();
    expect(parseCompaniesSearch({ page: 'nope' }).page).toBeUndefined();
    expect(parseCompaniesSearch({ page: '4' }).page).toBe(4);
  });

  it('drops empty or non-string selections from the canonical URL', () => {
    expect(
      parseCompaniesSearch({ selectedCompany: '  ' }).selectedCompany,
    ).toBeUndefined();
    expect(
      parseCompaniesSearch({ selectedCompany: 42 }).selectedCompany,
    ).toBeUndefined();
  });
});

describe('companiesListingLoaderDeps', () => {
  it('preserves data-affecting search state while excluding pane selection', () => {
    expect(
      companiesListingLoaderDeps(
        parseCompaniesSearch({
          query: 'venture capital',
          page: '3',
          selectedCompany: 'acme-ventures',
        }),
      ),
    ).toEqual({
      query: 'venture capital',
      page: 3,
    });
  });
});

describe('includeSelectedCompanyMarket', () => {
  it('keeps a valid selected market available when it falls outside the fetched top markets', () => {
    expect(
      includeSelectedCompanyMarket(
        [{ slug: 'technology', name: 'Technology' }],
        { slug: 'niche-market', name: 'Niche market' },
      ),
    ).toEqual([
      { slug: 'niche-market', name: 'Niche market' },
      { slug: 'technology', name: 'Technology' },
    ]);
  });
});
