import { BoardApiError } from '@cavuno/board';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  list: vi.fn(),
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
  getBoard: () => {
    const markets = Object.assign(mocks.tree, { resolve: mocks.resolve });
    return {
      taxonomy: {
        categories: { resolve: mocks.resolve },
        skills: { resolve: mocks.resolve },
        places: { resolve: mocks.resolve, list: mocks.tree },
      },
      jobs: { list: mocks.list, search: mocks.list },
      companies: { list: mocks.list, markets },
    };
  },
}));
import { getCompaniesMarketPage } from './companies-pages';
import {
  getJobsCategoryPage,
  getJobsSkillPage,
  getJobsLocationPage,
} from './jobs-listing-pages';
const cases = [
  [
    'category',
    () =>
      getJobsCategoryPage({
        data: { categorySlug: 'missing', offset: 0, limit: 24 },
      }),
  ],
  [
    'skill',
    () =>
      getJobsSkillPage({
        data: { skillSlug: 'missing', offset: 0, limit: 24 },
      }),
  ],
  [
    'location',
    () =>
      getJobsLocationPage({
        data: { locationSlug: 'missing', offset: 0, limit: 24 },
      }),
  ],
  [
    'market',
    () =>
      getCompaniesMarketPage({
        data: { marketSlug: 'missing', offset: 0, limit: 24 },
      }),
  ],
] as const;
const missing = new BoardApiError({
  raw: { code: 'not_found', message: 'Unknown fixture slug' },
  status: 404,
  code: 'not_found',
  message: 'Unknown fixture slug',
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tree.mockResolvedValue({ data: [] });
});
describe('taxonomy listing outcomes', () => {
  for (const [name, load] of cases) {
    it(`${name}: missing resolution wins over listing rejection`, async () => {
      mocks.resolve.mockRejectedValue(missing);
      mocks.list.mockRejectedValue(missing);
      expect(await load()).toEqual({ kind: 'not_found' });
    });
    it(`${name}: canonical alias wins over listing rejection`, async () => {
      mocks.resolve.mockResolvedValue({ redirectTo: '/canonical-fixture' });
      mocks.list.mockRejectedValue(missing);
      expect(await load()).toEqual({
        kind: 'redirect',
        to: '/canonical-fixture',
      });
    });
    it(`${name}: known slug preserves unrelated listing failure`, async () => {
      const outage = new Error('fixture outage');
      mocks.resolve.mockResolvedValue({
        displayName: 'Fixture',
        redirectTo: null,
      });
      mocks.list.mockRejectedValue(outage);
      await expect(load()).rejects.toBe(outage);
    });
    it(`${name}: resolution outage propagates`, async () => {
      const outage = new Error('resolver outage');
      mocks.resolve.mockRejectedValue(outage);
      mocks.list.mockRejectedValue(missing);
      await expect(load()).rejects.toBe(outage);
    });
  }
});
