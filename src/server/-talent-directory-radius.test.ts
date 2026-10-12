import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  talentList: vi.fn(),
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
vi.mock('./profile-filter-fields', () => ({
  profileCustomFilters: async () => ({
    clauses: undefined,
    fields: Promise.resolve([]),
  }),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    taxonomy: { places: { resolve: mocks.resolve } },
    talent: { list: mocks.talentList },
  }),
}));

import { placeRadiusGeoCache } from './listing-place-cache';
import { getTalentIndexPage } from './talent-pages';

function resolution(placeType: string, countryCode: string) {
  return {
    object: 'taxonomy_resolution',
    type: 'place',
    sourceSlug: 'fixture-place',
    canonicalSlug: 'fixture-place',
    displayName: 'Fixture Place, Fixture Region',
    redirectTo: null,
    geo: { lat: 1, lng: 2, countryCode, placeType },
  };
}

const page = { offset: 0, limit: 24, place: 'fixture-place' };

/** The query the directory was read with. */
function directoryQuery() {
  const [query] = mocks.talentList.mock.calls[0] ?? [];
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  placeRadiusGeoCache.clear();
  mocks.talentList.mockResolvedValue({
    object: 'list',
    url: '/v1/talent',
    data: [],
    hasMore: false,
    nextCursor: null,
    count: 0,
  });
});

describe('talent directory search distance', () => {
  it('widens a city to the market default when the URL has no `within`', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'AU'));

    const result = await getTalentIndexPage({ data: page });

    expect(directoryQuery()).toMatchObject({
      place: 'fixture-place',
      radius: 50,
    });
    expect(result.placeRadius).toMatchObject({
      placeName: 'Fixture Place',
      radius: { unit: 'km', selected: { value: 50 }, explicit: false },
    });
  });

  it('sends a US distance in kilometres', async () => {
    mocks.resolve.mockResolvedValue(resolution('locality', 'US'));

    await getTalentIndexPage({ data: { ...page, within: 25 } });

    expect(directoryQuery().radius).toBeCloseTo(40.23, 2);
  });

  it('lists the place itself for `within=0`, keeping the control', async () => {
    mocks.resolve.mockResolvedValue(resolution('city', 'US'));

    const result = await getTalentIndexPage({ data: { ...page, within: 0 } });

    expect(directoryQuery().radius).toBeUndefined();
    expect(result.placeRadius?.radius).toMatchObject({
      selected: null,
      explicit: true,
    });
  });

  it('shows no control and sends no radius for a region', async () => {
    mocks.resolve.mockResolvedValue(resolution('region', 'US'));

    const result = await getTalentIndexPage({ data: { ...page, within: 25 } });

    expect(directoryQuery().radius).toBeUndefined();
    expect(result.placeRadius).toBeNull();
  });

  it('lists the place as given when it cannot be resolved', async () => {
    mocks.resolve.mockRejectedValue(new Error('unavailable'));

    const result = await getTalentIndexPage({ data: page });

    expect(directoryQuery()).toMatchObject({ place: 'fixture-place' });
    expect(directoryQuery().radius).toBeUndefined();
    expect(result.placeRadius).toBeNull();
  });

  it('resolves nothing without a place', async () => {
    const result = await getTalentIndexPage({
      data: { offset: 0, limit: 24, within: 25 },
    });

    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(directoryQuery().radius).toBeUndefined();
    expect(result.placeRadius).toBeNull();
  });
});
