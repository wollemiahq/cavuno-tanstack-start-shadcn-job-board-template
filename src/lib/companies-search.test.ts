import { describe, expect, it } from 'vitest';

import {
  companiesListingLoaderDeps,
  includeSelectedCompanyMarket,
  parseCompaniesSearch,
} from './companies-search';

describe('parseCompaniesSearch', () => {
  it('keeps only the company listing query, cursor, page, and selected company', () => {
    expect(
      parseCompaniesSearch({
        query: 'venture capital',
        cursor: 'next-page-token',
        page: '3',
        selectedCompany: 'acme-ventures',
        q: 'job-only query',
        remoteOption: 'remote',
      }),
    ).toEqual({
      query: 'venture capital',
      cursor: 'next-page-token',
      page: 3,
      selectedCompany: 'acme-ventures',
    });
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
          cursor: 'next-page-token',
          page: '3',
          selectedCompany: 'acme-ventures',
        }),
      ),
    ).toEqual({
      query: 'venture capital',
      cursor: 'next-page-token',
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
