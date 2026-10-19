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
import {
  getJobsCategoryPage,
  getJobsLocationCategoryPage,
  getJobsLocationPage,
} from './jobs-listing-pages';

const INTRO = '<p>Fixture intro.</p>';

type CategoryInput = Parameters<typeof getJobsCategoryPage>[0]['data'];
type LocationInput = Parameters<typeof getJobsLocationPage>[0]['data'];

const pages = [
  [
    'category',
    (filters: Partial<CategoryInput>) =>
      getJobsCategoryPage({
        data: { categorySlug: 'fixture', offset: 0, limit: 24, ...filters },
      }),
  ],
  [
    'location',
    (filters: Partial<LocationInput>) =>
      getJobsLocationPage({
        data: { locationSlug: 'fixture', offset: 0, limit: 24, ...filters },
      }),
  ],
] as const;

const resolution = {
  sourceSlug: 'fixture',
  canonicalSlug: 'fixture',
  displayName: 'Fixture',
  redirectTo: null,
};
const withIntro = { ...resolution, introHtml: INTRO };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tree.mockResolvedValue({ data: [] });
  mocks.list.mockResolvedValue({ data: [], count: 0 });
});

describe('landing page intro', () => {
  for (const [name, load] of pages) {
    it(`${name}: shows the intro on page 1 with no filter`, async () => {
      mocks.resolve.mockResolvedValue(withIntro);
      const page = await load({});
      expect(page).toMatchObject({ kind: 'ok', introHtml: INTRO });
    });

    const views: [string, Partial<CategoryInput & LocationInput>][] = [
      ['page 2', { offset: 24 }],
      ['a filter', { remoteOption: 'remote' }],
      ['a seniority filter', { seniority: ['senior'] }],
      ['a sort', { sort: 'newest' }],
    ];
    for (const [view, filters] of views) {
      it(`${name}: hides the intro on ${view}`, async () => {
        mocks.resolve.mockResolvedValue(withIntro);
        const page = await load(filters);
        expect(page).toMatchObject({ kind: 'ok', introHtml: undefined });
        if (page.kind !== 'ok') throw new Error('Expected an ok page');
        expect(JSON.stringify(page)).not.toContain(INTRO);
      });
    }

    it(`${name}: has no intro when the API sends none`, async () => {
      mocks.resolve.mockResolvedValue(resolution);
      const page = await load({});
      expect(page).toMatchObject({ kind: 'ok', introHtml: undefined });
    });
  }

  it('location and category: carries neither intro', async () => {
    mocks.resolve.mockResolvedValue(withIntro);
    mocks.list.mockResolvedValue({ data: [], count: 3 });
    const page = await getJobsLocationCategoryPage({
      data: {
        locationSlug: 'fixture',
        categorySlug: 'fixture',
        offset: 0,
        limit: 24,
      },
    });
    expect(page).toMatchObject({ kind: 'ok' });
    expect(JSON.stringify(page)).not.toContain(INTRO);
  });

  it('location: hides the intro for a query or a chosen distance', async () => {
    mocks.resolve.mockResolvedValue(withIntro);
    const [, load] = pages[1];
    for (const filters of [{ q: 'designer' }, { within: 0 }]) {
      expect(await load(filters)).toMatchObject({
        kind: 'ok',
        introHtml: undefined,
      });
    }
  });
});
