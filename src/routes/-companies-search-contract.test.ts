import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCompanyMarket, getCompanyMarkets, getSeoBase, listCompanies, searchCompanies } =
  vi.hoisted(() => ({
    getCompanyMarket: vi.fn(),
    getCompanyMarkets: vi.fn(),
    getSeoBase: vi.fn(),
    listCompanies: vi.fn(),
    searchCompanies: vi.fn(),
  }));

vi.mock("../server/queries", () => ({
  getCompanyMarket,
  getCompanyMarkets,
  getSeoBase,
  listCompanies,
  searchCompanies,
  subscribeJobAlert: vi.fn(),
}));

import { Route as CompaniesRoute } from "./companies.index";
import { Route as MarketRoute } from "./companies.markets.$market";

function validateSearch(
  route: typeof CompaniesRoute | typeof MarketRoute,
  search: Record<string, unknown>,
) {
  const validate = route.options.validateSearch;
  if (typeof validate !== "function") {
    throw new Error("The companies route does not define search validation");
  }
  return validate(search);
}

function loaderDeps(
  route: typeof CompaniesRoute | typeof MarketRoute,
  search: Record<string, unknown>,
) {
  const project = route.options.loaderDeps;
  if (typeof project !== "function") {
    throw new Error("The companies route does not define loader dependencies");
  }
  return project({ search } as never);
}

function loader(route: typeof CompaniesRoute | typeof MarketRoute) {
  const load = route.options.loader;
  if (typeof load !== "function") {
    throw new Error("The companies route does not define a callable loader");
  }
  return load;
}

beforeEach(() => {
  getCompanyMarket.mockReset();
  getCompanyMarket.mockResolvedValue({
    canonicalSlug: "venture-capital",
    displayName: "Venture Capital",
    redirectTo: null,
    sourceSlug: "venture-capital",
  });
  getCompanyMarkets.mockReset();
  getCompanyMarkets.mockResolvedValue({ data: [] });
  getSeoBase.mockReset();
  getSeoBase.mockResolvedValue({});
  listCompanies.mockReset();
  listCompanies.mockResolvedValue({ data: [], count: 0 });
  searchCompanies.mockReset();
  searchCompanies.mockResolvedValue({ data: [], hasMore: false, nextCursor: null });
});

describe("companies route — URL-backed master-detail search", () => {
  it("accepts the data query, cursor, browse page, and selected company", () => {
    expect(
      validateSearch(CompaniesRoute, {
        query: "acme",
        cursor: "next-token",
        page: "3",
        selectedCompany: "acme-ventures",
      }),
    ).toEqual({
      query: "acme",
      cursor: "next-token",
      page: 3,
      selectedCompany: "acme-ventures",
    });
  });

  it("keeps canonical browse pagination while pane selection stays out of loader deps", async () => {
    const first = loaderDeps(CompaniesRoute, {
      page: 3,
      selectedCompany: "first-company",
    });
    const second = loaderDeps(CompaniesRoute, {
      page: 3,
      selectedCompany: "second-company",
    });

    await loader(CompaniesRoute)({ deps: first } as never);

    expect(listCompanies).toHaveBeenCalledWith({
      data: { offset: 48, limit: 24 },
    });
    expect(first).toEqual(second);
    expect(first).not.toHaveProperty("selectedCompany");
  });
});

describe("company market route — scoped browse and search", () => {
  it("accepts the same URL-backed search and pane state as /companies", () => {
    expect(
      validateSearch(MarketRoute, {
        query: "acme",
        cursor: "next-token",
        page: "3",
        selectedCompany: "acme-ventures",
      }),
    ).toEqual({
      query: "acme",
      cursor: "next-token",
      page: 3,
      selectedCompany: "acme-ventures",
    });
  });

  it("retains page pagination for browse and sends query plus market to search", async () => {
    const load = loader(MarketRoute);

    await load({
      params: { market: "venture-capital" },
      deps: { page: 3 },
    } as never);

    expect(listCompanies).toHaveBeenCalledWith({
      data: {
        marketSlug: "venture-capital",
        offset: 48,
        limit: 24,
      },
    });

    listCompanies.mockClear();
    await load({
      params: { market: "venture-capital" },
      deps: { query: "acme", cursor: "next-token" },
    } as never);

    expect(searchCompanies).toHaveBeenCalledWith({
      data: {
        query: "acme",
        marketSlug: "venture-capital",
        cursor: "next-token",
        limit: 24,
      },
    });
    expect(listCompanies).not.toHaveBeenCalled();
  });
});
