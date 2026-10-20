import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '@/lib/localized-path';

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
vi.mock('../lib/data-source.server', () => ({
  getDataSource: () => 'board',
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
import {
  combinationInPlaceCountCache,
  placeRadiusGeoCache,
} from './listing-place-cache';

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

type Place = ReturnType<typeof resolution>;

function suggestedResolution(slug: string) {
  return {
    ...resolution('locality', 'AU'),
    sourceSlug: slug,
    canonicalSlug: slug,
    displayName: 'Marrickville',
    suggested: true,
    ancestors: [],
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
  placeRadiusGeoCache.clear();
  combinationInPlaceCountCache.clear();
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

    // The API applies the market default; the starter sends no kilometres.
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'fixture-place',
        defaultRadius: true,
      }),
      expect.anything(),
    );
    expect(mocks.list.mock.calls[0]?.[0].radius).toBeUndefined();
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
        href: `https://fixture.example${localizePath('/jobs/locations/fixture-place')}`,
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
        href: `https://fixture.example${localizePath('/jobs/locations/fixture-place')}`,
      },
    ]);
  });

  it('noindexes a combination with no jobs of its own in a place that has jobs', async () => {
    // Houston has jobs, but its nursing jobs are all nearby (Pasadena).
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));
    // The in-place count is the `limit: 1` read; the listing is widened.
    mocks.list.mockImplementation(async (query: { limit?: number }) => ({
      ...emptyList,
      count: query.limit === 1 ? 0 : 8,
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
    mocks.list.mockImplementation(async (query: { limit?: number }) => ({
      ...emptyList,
      count: query.limit === 1 ? 2 : 8,
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

  it('lists a suggested place within its own default distance, noindexed below 5 on-site or hybrid jobs', async () => {
    // A place from `places.suggest`: the resolution says so (`suggested`).
    const slug = 'marrickville-nsw-australia';
    mocks.resolve.mockResolvedValue(suggestedResolution(slug));
    mocks.list.mockImplementation(async (query: { limit?: number }) => ({
      ...emptyList,
      count: query.limit === 1 ? 4 : 30,
    }));

    const result = await getJobsLocationPage({
      data: { ...page, locationSlug: slug },
    });

    // The API applies the place's own default distance.
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ location: slug, defaultRadius: true }),
      expect.anything(),
    );
    // Only on-site and hybrid jobs count toward indexing.
    expect(mocks.list).toHaveBeenCalledWith(
      {
        location: slug,
        remoteOption: ['on_site', 'hybrid'],
        offset: 0,
        limit: 1,
      },
      expect.anything(),
    );
    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(robots(result.head)?.content).toBe('noindex, follow');
  });

  it('trails a suggested place under its ancestors, leaving an unlinked one out of the JSON-LD', async () => {
    const slug = 'marrickville-nsw-australia';
    mocks.resolve.mockResolvedValue({
      ...suggestedResolution(slug),
      ancestors: [
        {
          displayName: 'Australia',
          placeType: 'country',
          canonicalSlug: 'australia',
        },
        {
          displayName: 'New South Wales',
          placeType: 'region',
          canonicalSlug: null,
        },
        { displayName: 'Sydney', placeType: 'city', canonicalSlug: 'sydney' },
      ],
    });

    const result = await getJobsLocationPage({
      data: { ...page, locationSlug: slug },
    });

    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(result.breadcrumbTrail.slice(2)).toEqual([
      { name: 'Australia', href: '/jobs/locations/australia' },
      { name: 'New South Wales' },
      { name: 'Sydney', href: '/jobs/locations/sydney' },
      { name: 'Marrickville' },
    ]);
    const breadcrumbList = result.jsonLd.find(
      (entry) => entry['@type'] === 'BreadcrumbList',
    );
    expect(breadcrumbList?.itemListElement).toEqual([
      expect.objectContaining({ position: 1 }),
      expect.objectContaining({ position: 2 }),
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Australia',
        item: `https://fixture.example${localizePath('/jobs/locations/australia')}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'Sydney',
        item: `https://fixture.example${localizePath('/jobs/locations/sydney')}`,
      },
      { '@type': 'ListItem', position: 5, name: 'Marrickville' },
    ]);
  });

  it('indexes a suggested place with 5 on-site or hybrid jobs', async () => {
    const slug = 'marrickville-nsw-australia';
    mocks.resolve.mockResolvedValue(suggestedResolution(slug));
    mocks.tree.mockRejectedValue(new Error('places unavailable'));
    mocks.list.mockImplementation(async (query: { limit?: number }) => ({
      ...emptyList,
      count: query.limit === 1 ? 5 : 30,
    }));

    const result = await getJobsLocationPage({
      data: { ...page, locationSlug: slug },
    });
    const chosen = await getJobsLocationPage({
      data: { ...page, locationSlug: slug, within: 25 },
    });

    if (result.kind !== 'ok' || chosen.kind !== 'ok') {
      throw new Error('expected listings');
    }
    expect(robots(result.head)).toBeUndefined();
    // A chosen distance stays noindexed and skips the count.
    expect(robots(chosen.head)?.content).toBe('noindex, follow');
    expect(
      mocks.list.mock.calls.filter(([query]) => query.limit === 1),
    ).toHaveLength(1);
  });

  it('noindexes a suggested place when its count read fails', async () => {
    const slug = 'marrickville-nsw-australia';
    mocks.resolve.mockResolvedValue(suggestedResolution(slug));
    mocks.list.mockImplementation(async (query: { limit?: number }) => {
      if (query.limit === 1) throw new Error('count unavailable');
      return { ...emptyList, count: 30 };
    });

    const result = await getJobsLocationPage({
      data: { ...page, locationSlug: slug },
    });

    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(robots(result.head)?.content).toBe('noindex, follow');
  });

  it('reads no suggested-place count for a board place', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'AU'));

    await getJobsLocationPage({ data: page });

    expect(
      mocks.list.mock.calls.filter(([query]) => query.limit === 1),
    ).toHaveLength(0);
  });

  it('noindexes a combination in a suggested place, whose exact read is widened', async () => {
    // The API widens a suggested place without `radius` to its default
    // distance, so the combination's in-place read finds nearby jobs.
    mocks.resolve.mockResolvedValue(
      suggestedResolution('marrickville-nsw-australia'),
    );
    mocks.list.mockResolvedValue({ ...emptyList, count: 8 });

    const category = await getJobsLocationCategoryPage({
      data: { ...page, categorySlug: 'nursing' },
    });
    const skill = await getJobsLocationSkillPage({
      data: { ...page, skillSlug: 'react' },
    });

    if (category.kind !== 'ok' || skill.kind !== 'ok') {
      throw new Error('expected listings');
    }
    expect(robots(category.head)?.content).toBe('noindex, follow');
    expect(robots(skill.head)?.content).toBe('noindex, follow');
  });

  it('keeps the default distance indexable when the place directory is unreadable', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));
    mocks.tree.mockRejectedValue(new Error('directory down'));

    const result = await getJobsLocationPage({ data: page });

    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(robots(result.head)).toBeUndefined();
  });
  it('starts the exact-place list without waiting for the place', async () => {
    let settle: (place: Place) => void = () => {};
    mocks.resolve.mockReturnValue(
      new Promise<Place>((resolve) => {
        settle = resolve;
      }),
    );

    const pending = getJobsLocationPage({ data: { ...page, within: 0 } });
    await vi.waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    settle(resolution('city', 'US'));

    expect((await pending).kind).toBe('ok');
  });

  it("starts a cold place's default-distance list without waiting for the place", async () => {
    let settle: (place: Place) => void = () => {};
    mocks.resolve.mockReturnValue(
      new Promise<Place>((resolve) => {
        settle = resolve;
      }),
    );
    const pending = getJobsLocationPage({ data: page });
    await vi.waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    expect(mocks.list.mock.calls[0]?.[0]).toMatchObject({
      defaultRadius: true,
    });
    settle(resolution('city', 'US'));

    expect((await pending).kind).toBe('ok');
  });

  it("reads a combination's own count only for its plain first page, once", async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));
    const countReads = () =>
      mocks.list.mock.calls.filter(([query]) => query.limit === 1).length;

    await getJobsLocationCategoryPage({
      data: { ...page, categorySlug: 'nursing' },
    });
    await getJobsLocationCategoryPage({
      data: { ...page, categorySlug: 'nursing' },
    });
    await getJobsLocationCategoryPage({
      data: { ...page, categorySlug: 'nursing', offset: 24 },
    });
    await getJobsLocationCategoryPage({
      data: { ...page, categorySlug: 'nursing', remoteOption: 'remote' },
    });

    expect(countReads()).toBe(1);
  });
});

describe('location listing read order on a cold slug', () => {
  it('starts the job list, breadcrumb tree and keyword resolve before the place resolves', async () => {
    let settlePlace: (place: Place) => void = () => undefined;
    const pendingPlace = new Promise<Place>((resolve) => {
      settlePlace = resolve;
    });
    const category = { ...resolution('city', 'AU'), type: 'category' };
    mocks.resolve.mockImplementation((slug: string) =>
      slug === 'fixture-place' ? pendingPlace : Promise.resolve(category),
    );

    const rendering = getJobsLocationCategoryPage({
      data: { ...page, categorySlug: 'fixture-category' },
    });
    await Promise.resolve();

    // Only the in-place count needs the place (whether it widens).
    expect(mocks.tree).toHaveBeenCalledTimes(1);
    expect(mocks.resolve).toHaveBeenCalledWith(
      'fixture-category',
      expect.anything(),
    );
    await vi.waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ defaultRadius: true }),
      expect.anything(),
    );

    settlePlace(resolution('city', 'AU'));
    await rendering;
    // Then the in-place count for the widened city.
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1 }),
      expect.anything(),
    );
  });
});
