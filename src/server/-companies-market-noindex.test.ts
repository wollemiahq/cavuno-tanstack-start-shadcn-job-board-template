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
import { getCompaniesMarketPage } from './companies-pages';

async function marketPage(
  data: { query?: string },
  indexable: boolean | undefined,
) {
  const envelope = { data: [], count: 0 };
  mocks.resolve.mockResolvedValue({
    displayName: 'Fixture',
    redirectTo: null,
    indexable,
  });
  mocks.list.mockResolvedValue(envelope);
  mocks.search.mockResolvedValue(envelope);
  const result = await getCompaniesMarketPage({
    data: { marketSlug: 'fixture', offset: 0, limit: 24, ...data },
  });
  if (result.kind !== 'ok') throw new Error(`unexpected ${result.kind}`);
  return result;
}

async function robotsFor(
  data: { query?: string },
  indexable: boolean | undefined,
) {
  const { head } = await marketPage(data, indexable);
  return head.meta.find((tag) => 'name' in tag && tag.name === 'robots');
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tree.mockResolvedValue({ data: [] });
});

describe("market page robots follow the API's indexable verdict", () => {
  it('noindexes a market the API marks not indexable', async () => {
    expect(await robotsFor({}, false)).toEqual({
      name: 'robots',
      content: 'noindex, follow',
    });
  });

  it('indexes a market the API marks indexable, or that has no verdict', async () => {
    expect(await robotsFor({}, true)).toBeUndefined();
    expect(await robotsFor({}, undefined)).toBeUndefined();
  });

  it('leaves a search view alone', async () => {
    expect(await robotsFor({ query: 'fixture' }, false)).toBeUndefined();
  });
});

describe('market link lists', () => {
  it('keep only markets the API marks indexable', async () => {
    mocks.tree.mockResolvedValue({
      data: [
        { slug: 'linked', indexable: true },
        { slug: 'unlinked', indexable: false },
      ],
    });
    const { markets } = await marketPage({}, true);
    expect(markets.map((market) => market.slug)).toEqual(['linked']);
  });
});
