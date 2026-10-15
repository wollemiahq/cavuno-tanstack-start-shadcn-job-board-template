import { BoardApiError, type TaxonomyResolution } from '@cavuno/board';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '@/lib/localized-path';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder = {
      validator: () => builder,
      middleware: () => builder,
      handler:
        <TData, TResult>(
          handler: (input: { data: TData; context: object }) => TResult,
        ) =>
        (input: { data: TData }) =>
          handler({ ...input, context: {} }),
    };
    return builder;
  },
}));
vi.mock('../lib/board-access-middleware', () => ({
  boardAccessMiddleware: {},
}));
vi.mock('./board-access', () => ({
  gatedRead: <TResult>(
    _context: Record<string, never>,
    read: (headers: Record<string, string>) => TResult,
  ) => read({}),
}));
vi.mock('../lib/board-context-cache', () => ({
  readBoardContext: async () => ({ name: 'Fixture board', language: 'en' }),
}));
vi.mock('../lib/data-source.server', () => ({
  getDataSource: () => 'board',
}));
vi.mock('../lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://fixture.example',
}));

const api = vi.hoisted(() => ({
  resolve: vi.fn(),
  talentList: vi.fn(),
  talentPlaces: vi.fn(),
}));
vi.mock('../lib/board', () => ({
  getBoard: () => ({
    taxonomy: { places: { resolve: api.resolve } },
    talent: { list: api.talentList, places: { list: api.talentPlaces } },
    profileFields: {
      retrieve: async () => ({ definitions: [], referenceDefinitions: [] }),
    },
  }),
}));

import { getTalentLocationPage } from './talent-pages';

const zurich = {
  object: 'talent_place' as const,
  id: 'zrh',
  parentId: 'ch',
  slug: 'zurich',
  canonicalSlug: 'zuerich',
  name: 'Zurich',
  displayName: 'Zürich',
  placeType: 'city',
  countryCode: 'CH',
  regionCode: null,
  candidateCount: 7,
};
const switzerland = {
  ...zurich,
  id: 'ch',
  parentId: null,
  slug: 'switzerland',
  canonicalSlug: 'schweiz',
  name: 'Switzerland',
  displayName: 'Schweiz',
  placeType: 'country',
  candidateCount: 9,
};

function resolution(
  overrides: Partial<TaxonomyResolution> = {},
): TaxonomyResolution {
  return {
    object: 'taxonomy_resolution',
    type: 'place',
    sourceSlug: 'zurich',
    canonicalSlug: 'zuerich',
    displayName: 'Zürich, Schweiz',
    redirectTo: null,
    geo: {
      placeType: 'city',
      lat: 47.37,
      lng: 8.54,
      countryCode: 'CH',
      regionCode: 'ZH',
      region: 'Zürich',
      city: 'Zürich',
      locality: null,
    },
    ...overrides,
  };
}

const notFound = (code: string) =>
  new BoardApiError({
    status: 404,
    code,
    message: 'Not Found',
    raw: undefined,
  });

function page(locationSlug: string, within?: number) {
  return getTalentLocationPage({
    data: { locationSlug, within, offset: 0, limit: 24 },
  });
}

beforeEach(() => {
  api.resolve.mockReset().mockResolvedValue(resolution());
  api.talentList
    .mockReset()
    .mockResolvedValue({ object: 'list', data: [], count: 7 });
  api.talentPlaces
    .mockReset()
    .mockResolvedValue({ object: 'list', data: [zurich, switzerland] });
});

describe('talent location page', () => {
  it('renders the canonical slug with a self canonical and the place trail', async () => {
    const result = await page('zuerich');
    if (result.kind !== 'ok') throw new Error('Expected a page');
    expect(result.head.links).toContainEqual({
      rel: 'canonical',
      href: `https://fixture.example${localizePath('/talent/locations/zuerich')}`,
    });
    expect(result.head.meta).not.toContainEqual(
      expect.objectContaining({ name: 'robots' }),
    );
    expect(result.breadcrumbTrail.slice(2)).toEqual([
      { name: 'Schweiz', href: '/talent/locations/schweiz' },
      { name: 'Zürich' },
    ]);
    expect(api.talentList).toHaveBeenCalledWith(
      expect.objectContaining({ place: 'zuerich' }),
      expect.anything(),
    );
  });

  it('redirects a listed English slug to its board-language link slug', async () => {
    expect(await page('zurich')).toEqual({
      kind: 'redirect',
      to: 'zuerich',
    });
  });

  it('follows the talent place list, not the resolver, when they disagree', async () => {
    // The resolver can name another canonical slug (an ISO-based one for an
    // active region, or an ungated translation); the directory, breadcrumbs
    // and sitemap link the list's slug, so that one stays put.
    api.resolve.mockResolvedValue(
      resolution({ canonicalSlug: 'zh-ch', redirectTo: 'zh-ch' }),
    );
    const result = await page('zuerich');
    expect(result.kind).toBe('ok');
  });

  it('renders a resolvable place the list does not hold, without redirecting', async () => {
    api.resolve.mockResolvedValue(
      resolution({
        sourceSlug: 'bern',
        canonicalSlug: 'bern-ch',
        redirectTo: 'bern-ch',
      }),
    );
    const result = await page('bern');
    expect(result.kind).toBe('ok');
  });

  it('404s a slug that neither the list nor the resolver knows', async () => {
    api.resolve.mockRejectedValue(notFound('places_not_found'));
    expect(await page('atlantis')).toEqual({ kind: 'not_found' });
  });

  it('404s on a board without a talent directory', async () => {
    api.talentList.mockRejectedValue(notFound('talent_directory_not_found'));
    api.talentPlaces.mockRejectedValue(notFound('talent_directory_not_found'));
    expect(await page('zuerich')).toEqual({ kind: 'not_found' });
  });

  it('keeps a chosen search distance out of the index', async () => {
    const result = await page('zuerich', 10);
    if (result.kind !== 'ok') throw new Error('Expected a page');
    expect(result.head.meta).toContainEqual({
      name: 'robots',
      content: 'noindex, follow',
    });
    expect(result.head.links).toContainEqual({
      rel: 'canonical',
      href: `https://fixture.example${localizePath('/talent/locations/zuerich')}`,
    });
  });

  it('renders the restricted gate out of the index for an employers-only directory', async () => {
    api.talentList.mockRejectedValue(
      new BoardApiError({
        status: 403,
        code: 'talent_directory_restricted',
        message: 'Forbidden',
        raw: undefined,
      }),
    );
    api.talentPlaces.mockRejectedValue(new Error('restricted'));
    const result = await page('zuerich');
    if (result.kind !== 'ok') throw new Error('Expected a page');
    expect(result.restricted).toBe(true);
    expect(result.page).toBeNull();
    expect(result.head.meta).toContainEqual({
      name: 'robots',
      content: 'noindex, follow',
    });
  });
});
