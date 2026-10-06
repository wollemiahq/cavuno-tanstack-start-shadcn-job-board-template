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
  // The place directory: the fixture place has jobs of its own.
  mocks.tree.mockResolvedValue({
    data: [{ slug: 'fixture-place', jobCount: 3 }],
  });
  mocks.list.mockResolvedValue(emptyList);
  mocks.search.mockResolvedValue({ ...emptyList, object: 'search_result' });
});

describe('location listing search distance', () => {
  it('lists a city within the market default, indexable, when the URL has no `within`', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'AU'));

    const result = await getJobsLocationPage({ data: page });

    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'fixture-place', radius: 50 }),
      expect.anything(),
    );
    expect(result).toMatchObject({
      kind: 'ok',
      searchRadius: {
        unit: 'km',
        selected: { value: 50 },
        explicit: false,
      },
    });
    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(robots(result.head)).toBeUndefined();
  });

  it('lists the exact place for `within=0`, noindexed', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));

    const result = await getJobsLocationPage({ data: { ...page, within: 0 } });

    expect(mocks.list).toHaveBeenCalledWith(
      expect.not.objectContaining({ radius: expect.anything() }),
      expect.anything(),
    );
    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(result.searchRadius).toMatchObject({
      selected: null,
      explicit: true,
    });
    expect(robots(result.head)?.content).toBe('noindex, follow');
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

  it('ignores `within` and the default on a region page', async () => {
    mocks.resolve.mockResolvedValue(resolution('region', 'US'));

    await getJobsLocationPage({ data: page });
    const result = await getJobsLocationPage({ data: { ...page, within: 25 } });

    for (const [query] of mocks.list.mock.calls) {
      expect(query.radius).toBeUndefined();
    }
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

  it('noindexes the default distance on a city with no jobs of its own', async () => {
    // Pasadena, TX: viewable through nearby Houston jobs, not indexable.
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));
    mocks.tree.mockResolvedValue({
      data: [{ slug: 'houston-tx-united-states', jobCount: 12 }],
    });

    const result = await getJobsLocationPage({ data: page });

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(result.searchRadius).toMatchObject({ explicit: false });
    expect(robots(result.head)?.content).toBe('noindex, follow');
    expect(result.head.links).toEqual([
      {
        rel: 'canonical',
        href: 'https://fixture.example/jobs/locations/fixture-place',
      },
    ]);
  });

  it('noindexes a combination with no jobs of its own in a place that has jobs', async () => {
    // Houston has jobs, but its nursing jobs are all nearby (Pasadena).
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));
    mocks.list.mockImplementation(async (query: { radius?: number }) => ({
      ...emptyList,
      count: query.radius === undefined ? 0 : 8,
    }));

    const category = await getJobsLocationCategoryPage({
      data: { ...page, categorySlug: 'nursing' },
    });
    const skill = await getJobsLocationSkillPage({
      data: { ...page, skillSlug: 'react' },
    });

    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'fixture-place',
        category: 'nursing',
        limit: 1,
      }),
      expect.anything(),
    );
    if (category.kind !== 'ok' || skill.kind !== 'ok') {
      throw new Error('expected listings');
    }
    expect(robots(category.head)?.content).toBe('noindex, follow');
    expect(robots(skill.head)?.content).toBe('noindex, follow');
  });

  it('keeps a combination with jobs of its own in the place indexable', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));
    mocks.list.mockImplementation(async (query: { radius?: number }) => ({
      ...emptyList,
      count: query.radius === undefined ? 2 : 8,
    }));

    const category = await getJobsLocationCategoryPage({
      data: { ...page, categorySlug: 'nursing' },
    });
    const skill = await getJobsLocationSkillPage({
      data: { ...page, skillSlug: 'react' },
    });

    if (category.kind !== 'ok' || skill.kind !== 'ok') {
      throw new Error('expected listings');
    }
    expect(robots(category.head)).toBeUndefined();
    expect(robots(skill.head)).toBeUndefined();
  });

  it('keeps the default distance indexable when the place directory is unreadable', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));
    mocks.tree.mockRejectedValue(new Error('directory down'));

    const result = await getJobsLocationPage({ data: page });

    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(robots(result.head)).toBeUndefined();
  });
});
