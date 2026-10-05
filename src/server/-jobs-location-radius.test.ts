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
    taxonomy: {
      categories: { resolve: mocks.resolve },
      skills: { resolve: mocks.resolve },
      places: { resolve: mocks.resolve, list: mocks.tree },
    },
    jobs: { list: mocks.list, search: mocks.search },
  }),
}));

import {
  getJobsLocationCategoryPage,
  getJobsLocationPage,
  getJobsLocationSkillPage,
} from './jobs-listing-pages';

function resolution(placeType: string, countryCode: string) {
  return {
    object: 'taxonomy_resolution',
    type: 'place',
    sourceSlug: 'fixture-place',
    canonicalSlug: 'fixture-place',
    displayName: 'Fixture Place',
    redirectTo: null,
    geo: {
      lat: 1,
      lng: 2,
      countryCode,
      regionCode: null,
      region: null,
      city: null,
      locality: null,
      placeType,
    },
  };
}

const emptyList = {
  object: 'list',
  url: '/v1/jobs',
  data: [],
  hasMore: false,
  nextCursor: null,
  count: 0,
};

const page = { locationSlug: 'fixture-place', offset: 0, limit: 24 };

type HeadMeta = { name?: string; content?: string };

function robots(head: { meta: HeadMeta[] }) {
  return head.meta.find((entry) => entry.name === 'robots');
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tree.mockResolvedValue({ data: [] });
  mocks.list.mockResolvedValue(emptyList);
  mocks.search.mockResolvedValue({ ...emptyList, object: 'search_result' });
});

describe('location listing search distance', () => {
  it('lists the exact place, indexable, when the URL has no `within`', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'AU'));

    const result = await getJobsLocationPage({ data: page });

    expect(mocks.list).toHaveBeenCalledWith(
      expect.not.objectContaining({ radius: expect.anything() }),
      expect.anything(),
    );
    expect(result).toMatchObject({
      kind: 'ok',
      searchRadius: { unit: 'km', selected: null },
    });
    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(robots(result.head)).toBeUndefined();
  });

  it('widens a US city by `within` miles, sent as kilometres, and noindexes it', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));

    const result = await getJobsLocationPage({ data: { ...page, within: 25 } });

    const [query] = mocks.list.mock.calls[0] ?? [];
    expect(query.location).toBe('fixture-place');
    expect(query.radius).toBeCloseTo(40.23, 2);
    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(robots(result.head)).toEqual({
      name: 'robots',
      content: 'noindex, follow',
    });
    // The canonical stays the plain location URL.
    expect(result.head.links).toEqual([
      {
        rel: 'canonical',
        href: 'https://fixture.example/jobs/locations/fixture-place',
      },
    ]);
  });

  it('carries the distance into a keyword search on the location page', async () => {
    mocks.resolve.mockResolvedValue(resolution('locality', 'DE'));

    await getJobsLocationPage({ data: { ...page, q: 'nurse', within: 10 } });

    expect(mocks.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'nurse',
        filters: expect.objectContaining({
          location: 'fixture-place',
          radius: 10,
        }),
      }),
      undefined,
      expect.anything(),
    );
  });

  it('ignores `within` on a region page', async () => {
    mocks.resolve.mockResolvedValue(resolution('region', 'US'));

    const result = await getJobsLocationPage({ data: { ...page, within: 25 } });

    expect(mocks.list).toHaveBeenCalledWith(
      expect.not.objectContaining({ radius: expect.anything() }),
      expect.anything(),
    );
    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(result.searchRadius).toBeNull();
    expect(robots(result.head)).toBeUndefined();
  });

  it('widens the location + category listing too', async () => {
    mocks.resolve.mockImplementation(async (slug: string) =>
      slug === 'nursing'
        ? {
            ...resolution('city', 'GB'),
            type: 'category',
            displayName: 'Nursing',
          }
        : resolution('city', 'GB'),
    );

    const result = await getJobsLocationCategoryPage({
      data: { ...page, categorySlug: 'nursing', within: 5 },
    });

    const [query] = mocks.list.mock.calls[0] ?? [];
    expect(query).toMatchObject({
      location: 'fixture-place',
      category: 'nursing',
    });
    expect(query.radius).toBeCloseTo(8.05, 2);
    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(robots(result.head)?.content).toBe('noindex, follow');
  });

  it('widens the location + skill listing too', async () => {
    mocks.resolve.mockImplementation(async (slug: string) =>
      slug === 'react'
        ? { ...resolution('city', 'US'), type: 'skill', displayName: 'React' }
        : resolution('city', 'US'),
    );

    const result = await getJobsLocationSkillPage({
      data: { ...page, skillSlug: 'react', within: 10 },
    });

    const [query] = mocks.list.mock.calls[0] ?? [];
    expect(query).toMatchObject({
      location: 'fixture-place',
      skill: 'react',
    });
    expect(query.radius).toBeCloseTo(16.09, 2);
    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(result.searchRadius).toMatchObject({
      unit: 'mi',
      selected: { value: 10 },
    });
    expect(robots(result.head)?.content).toBe('noindex, follow');
  });
});
