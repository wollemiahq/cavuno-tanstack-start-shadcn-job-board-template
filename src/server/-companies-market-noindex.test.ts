import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  list: vi.fn(),
  search: vi.fn(),
  tree: vi.fn(),
}));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      validator: () => chain,
      middleware: () => chain,
      handler:
        <TData, TResult>(
          handler: (input: {
            data: TData;
            context: Record<string, never>;
          }) => TResult,
        ) =>
        (input: { data: TData }) =>
          handler({ ...input, context: {} }),
    };
    return chain;
  },
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('../lib/board-context-cache', () => ({
  readBoardContext: async () => ({ name: 'Fixture', language: 'en' }),
}));
vi.mock('../lib/data-source.server', () => ({
  getDataSource: () => 'board',
}));
vi.mock('../lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://fixture.example',
}));
vi.mock('./board-access', () => ({
  gatedRead: <TResult>(
    _context: Record<string, never>,
    read: (headers: Record<string, string>) => TResult,
  ) => read({}),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    companies: {
      list: mocks.list,
      search: mocks.search,
      markets: Object.assign(mocks.tree, { resolve: mocks.resolve }),
    },
  }),
}));
import {
  MIN_COMPANIES_PER_INDEXED_MARKET_PAGE,
  getCompaniesMarketPage,
} from './companies-pages';

async function robotsFor(
  data: { query?: string },
  count?: number,
  companyCount?: number,
) {
  const envelope = { data: [], count };
  mocks.resolve.mockResolvedValue({
    displayName: 'Fixture',
    redirectTo: null,
    companyCount,
  });
  mocks.list.mockResolvedValue(envelope);
  mocks.search.mockResolvedValue(envelope);
  const result = await getCompaniesMarketPage({
    data: { marketSlug: 'fixture', offset: 0, limit: 24, ...data },
  });
  if (result.kind !== 'ok') throw new Error(`unexpected ${result.kind}`);
  return result.head.meta.find((tag) => 'name' in tag && tag.name === 'robots');
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tree.mockResolvedValue({ data: [] });
});

describe('market page thin-content floor', () => {
  it('noindexes a market listing fewer companies than the floor', async () => {
    expect(
      await robotsFor({}, MIN_COMPANIES_PER_INDEXED_MARKET_PAGE - 1),
    ).toEqual({ name: 'robots', content: 'noindex, follow' });
  });

  it('indexes a market at the floor', async () => {
    expect(
      await robotsFor({}, MIN_COMPANIES_PER_INDEXED_MARKET_PAGE),
    ).toBeUndefined();
  });

  it('leaves a search view and a listing without a total alone', async () => {
    expect(await robotsFor({ query: 'fixture' }, 0)).toBeUndefined();
    expect(await robotsFor({}, undefined)).toBeUndefined();
  });

  it("uses the market's companyCount over the listing total when present", async () => {
    const floor = MIN_COMPANIES_PER_INDEXED_MARKET_PAGE;
    // Text matches lift the listing over the floor; the tagged count does not.
    expect(await robotsFor({}, floor + 10, floor - 1)).toEqual({
      name: 'robots',
      content: 'noindex, follow',
    });
    expect(await robotsFor({}, 0, floor)).toBeUndefined();
  });
});
