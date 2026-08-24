import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCompaniesIndexLoader } from './-companies-index-loader';
import { createCompaniesMarketLoader } from './-companies-market-loader';
import { Route as CompaniesRoute } from './companies.index';
import { Route as MarketRoute } from './companies.markets.$market';

import type { UrlSearchInput } from '../lib/pagination';
import type * as CompaniesPages from '../server/companies-pages';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const getCompaniesIndexPage =
  vi.fn<typeof CompaniesPages.getCompaniesIndexPage>();
const getCompaniesMarketPage =
  vi.fn<typeof CompaniesPages.getCompaniesMarketPage>();
const loadCompanies = createCompaniesIndexLoader(getCompaniesIndexPage);
const loadMarket = createCompaniesMarketLoader(getCompaniesMarketPage);

const seo = {
  boardName: 'Example Jobs',
  language: 'en',
  origin: 'https://example.com',
};
const head = { meta: [], links: [] };

function validateSearch(
  route: typeof CompaniesRoute | typeof MarketRoute,
  search: UrlSearchInput,
) {
  const validate = route.options.validateSearch;
  if (!validate) {
    throw new Error('The companies route does not define search validation');
  }
  if ('parse' in validate) return validate.parse(search);
  if ('~standard' in validate) {
    throw new Error('The companies route uses an unexpected async schema');
  }
  return validate(search);
}

function companiesLoaderDeps(search: ReturnType<typeof validateSearch>) {
  const project = CompaniesRoute.options.loaderDeps;
  if (!project) {
    throw new Error('The companies route does not define loader dependencies');
  }
  return project({ search });
}

function companiesLoaderContext(deps: { query?: string; page?: number }) {
  return { deps };
}

function marketLoaderContext(deps: { query?: string; page?: number }) {
  return {
    params: { market: 'venture-capital' },
    deps,
  };
}

beforeEach(() => {
  getCompaniesIndexPage.mockReset();
  getCompaniesIndexPage.mockResolvedValue({
    page: { data: [], count: 0 },
    searchUnavailable: false,
    markets: [],
    seo,
    head,
    jsonLd: [],
  });
  getCompaniesMarketPage.mockReset();
  getCompaniesMarketPage.mockResolvedValue({
    kind: 'ok',
    market: {
      object: 'taxonomy_resolution',
      type: 'market',
      sourceSlug: 'venture-capital',
      canonicalSlug: 'venture-capital',
      displayName: 'Venture capital',
      redirectTo: null,
      geo: null,
    },
    page: {
      object: 'list',
      url: '/v1/companies',
      data: [],
      hasMore: false,
      nextCursor: null,
      count: 0,
    },
    searchUnavailable: false,
    markets: [],
    seo,
    head,
    jsonLd: [],
  });
});

describe('companies route — URL-backed master-detail search', () => {
  it('does not append a job-alert acquisition band to the company directory', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/companies.index.tsx'),
      'utf8',
    );

    expect(source).not.toContain('AlertsBand');
    expect(source).not.toContain('subscribeJobAlert');
  });

  it('accepts the data query, unified page, and selected company', () => {
    expect(
      validateSearch(CompaniesRoute, {
        query: 'acme',
        page: '3',
        selectedCompany: 'acme-ventures',
      }),
    ).toEqual({
      query: 'acme',
      page: 3,
      selectedCompany: 'acme-ventures',
    });
  });

  it('keeps canonical browse pagination while pane selection stays out of loader deps', async () => {
    const first = companiesLoaderDeps({
      page: 3,
      selectedCompany: 'first-company',
    });
    const second = companiesLoaderDeps({
      page: 3,
      selectedCompany: 'second-company',
    });

    await loadCompanies(companiesLoaderContext(first));

    expect(getCompaniesIndexPage).toHaveBeenCalledWith({
      data: { offset: 48, limit: 24, query: undefined },
    });
    expect(first).toEqual(second);
    expect(first).not.toHaveProperty('selectedCompany');
  });

  it('preserves a serialized search outage for the route component', async () => {
    getCompaniesIndexPage.mockResolvedValueOnce({
      page: { data: [], count: 0 },
      searchUnavailable: true,
      markets: [],
      seo,
      head,
      jsonLd: [],
    });

    await expect(
      loadCompanies(companiesLoaderContext({ query: 'acme' })),
    ).resolves.toMatchObject({ searchUnavailable: true });
  });
});

describe('company market route — scoped browse and search', () => {
  it('accepts the same URL-backed search and pane state as /companies', () => {
    expect(
      validateSearch(MarketRoute, {
        query: 'acme',
        page: '3',
        selectedCompany: 'acme-ventures',
      }),
    ).toEqual({
      query: 'acme',
      page: 3,
      selectedCompany: 'acme-ventures',
    });
  });

  it('offset-paginates both browse and search, sending query plus market on search', async () => {
    await loadMarket(marketLoaderContext({ page: 3 }));

    expect(getCompaniesMarketPage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        marketSlug: 'venture-capital',
        offset: 48,
        limit: 24,
      }),
    });

    getCompaniesMarketPage.mockClear();
    await loadMarket(marketLoaderContext({ query: 'acme', page: 2 }));

    expect(getCompaniesMarketPage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        marketSlug: 'venture-capital',
        query: 'acme',
        offset: 24,
        limit: 24,
      }),
    });
  });
});
