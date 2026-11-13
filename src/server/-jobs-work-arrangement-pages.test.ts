import { MIN_JOBS_PER_INDEXED_PAGE } from '@cavuno/board/sitemap';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localizePath } from '@/lib/localized-path';
import { m } from '@/paraglide/messages';

const mocks = vi.hoisted(() => ({
  placeResolve: vi.fn(),
  termResolve: vi.fn(),
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
      categories: { resolve: mocks.termResolve },
      skills: { resolve: mocks.termResolve },
      places: { resolve: mocks.placeResolve, list: mocks.tree },
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

/** The Board API's resolution of a reserved slug: no geo, no ancestors. */
function arrangementResolution(slug: string) {
  return {
    object: 'taxonomy_resolution',
    type: 'place',
    sourceSlug: slug,
    canonicalSlug: slug,
    displayName: 'Fixture arrangement',
    redirectTo: null,
    geo: null,
  };
}

function placeResolution() {
  return {
    ...arrangementResolution('fixture-place'),
    displayName: 'Fixture Place',
    geo: {
      lat: 1,
      lng: 2,
      countryCode: 'AU',
      regionCode: null,
      region: null,
      city: null,
      locality: null,
      placeType: 'country',
    },
  };
}

const term = {
  object: 'taxonomy_resolution',
  type: 'category',
  sourceSlug: 'fixture-term',
  canonicalSlug: 'fixture-term',
  displayName: 'Fixture Term',
  redirectTo: null,
};

function listOf(count: number | undefined) {
  return {
    object: 'list',
    url: '/v1/jobs',
    data: [],
    hasMore: false,
    nextCursor: null,
    count,
  };
}

type HeadMeta = { name?: string; content?: string; title?: string };

function isNoindex(head: { meta: HeadMeta[] }) {
  return head.meta.some(
    (entry) => entry.name === 'robots' && entry.content === 'noindex, follow',
  );
}

function documentTitle(head: { meta: HeadMeta[] }) {
  return head.meta.find((entry) => entry.title !== undefined)?.title;
}

function page(locationSlug: string) {
  return { locationSlug, offset: 0, limit: 20 };
}

async function locationPage(
  data: Parameters<typeof getJobsLocationPage>[0]['data'],
) {
  const result = await getJobsLocationPage({ data });
  if (result.kind !== 'ok') throw new Error('expected a listing');
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  placeRadiusGeoCache.clear();
  combinationInPlaceCountCache.clear();
  mocks.tree.mockResolvedValue({
    data: [{ slug: 'fixture-place', jobCount: 3 }],
  });
  mocks.termResolve.mockResolvedValue(term);
  mocks.list.mockResolvedValue(listOf(MIN_JOBS_PER_INDEXED_PAGE));
});

describe('work arrangement page indexing', () => {
  it('indexes the plain remote page at the thin-content floor, from its own total', async () => {
    mocks.placeResolve.mockResolvedValue(arrangementResolution('remote'));

    const result = await locationPage(page('remote'));

    expect(isNoindex(result.head)).toBe(false);
    // The listing's total decides it: no extra read, no place directory.
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(mocks.tree).not.toHaveBeenCalled();
    expect(result.head.links).toEqual([
      {
        rel: 'canonical',
        href: `https://fixture.example${localizePath('/jobs/locations/remote')}`,
      },
    ]);
  });

  it('counts withheld jobs toward the floor', async () => {
    mocks.placeResolve.mockResolvedValue(arrangementResolution('remote'));
    mocks.list.mockResolvedValue({
      ...listOf(MIN_JOBS_PER_INDEXED_PAGE - 1),
      gatedCount: 1,
    });

    expect(isNoindex((await locationPage(page('remote'))).head)).toBe(false);
  });

  it('noindexes a thin remote page, and one whose count is unknown', async () => {
    mocks.placeResolve.mockResolvedValue(arrangementResolution('remote'));
    for (const count of [MIN_JOBS_PER_INDEXED_PAGE - 1, undefined]) {
      mocks.list.mockResolvedValue(listOf(count));
      expect(isNoindex((await locationPage(page('remote'))).head)).toBe(true);
    }
  });

  it('keeps the existing rule on a filtered or later remote view', async () => {
    mocks.placeResolve.mockResolvedValue(arrangementResolution('remote'));
    mocks.list.mockResolvedValue(listOf(1));

    for (const view of [
      { ...page('remote'), seniority: ['senior' as const] },
      { ...page('remote'), offset: 20 },
    ]) {
      expect(isNoindex((await locationPage(view)).head)).toBe(false);
    }
  });

  it('never indexes the hybrid or on-site page', async () => {
    mocks.list.mockResolvedValue(listOf(500));
    for (const slug of ['hybrid', 'on-site']) {
      mocks.placeResolve.mockResolvedValue(arrangementResolution(slug));
      expect(isNoindex((await locationPage(page(slug))).head)).toBe(true);
    }
  });

  it('never indexes an arrangement combination, remote included', async () => {
    mocks.list.mockResolvedValue(listOf(500));
    for (const slug of ['remote', 'hybrid', 'on-site']) {
      mocks.placeResolve.mockResolvedValue(arrangementResolution(slug));
      const byCategory = await getJobsLocationCategoryPage({
        data: { ...page(slug), categorySlug: 'fixture-term' },
      });
      const bySkill = await getJobsLocationSkillPage({
        data: { ...page(slug), skillSlug: 'fixture-term' },
      });
      if (byCategory.kind !== 'ok' || bySkill.kind !== 'ok') {
        throw new Error('expected listings');
      }
      expect(isNoindex(byCategory.head)).toBe(true);
      expect(isNoindex(bySkill.head)).toBe(true);
    }
  });

  it('leaves a real place page and its combination indexable', async () => {
    mocks.placeResolve.mockResolvedValue(placeResolution());
    mocks.list.mockResolvedValue(listOf(1));

    const result = await locationPage(page('fixture-place'));
    const combination = await getJobsLocationCategoryPage({
      data: { ...page('fixture-place'), categorySlug: 'fixture-term' },
    });

    expect(isNoindex(result.head)).toBe(false);
    expect(mocks.tree).toHaveBeenCalled();
    expect(documentTitle(result.head)).toContain(
      m.locationPage_jobsCountHeading({
        count: 1,
        countLabel: '1',
        place: 'Fixture Place',
      }),
    );
    if (combination.kind !== 'ok') throw new Error('expected a listing');
    expect(isNoindex(combination.head)).toBe(false);
  });
});

describe('work arrangement page wording', () => {
  it('titles and crumbs the page as the arrangement', async () => {
    mocks.placeResolve.mockResolvedValue(arrangementResolution('remote'));

    const result = await locationPage(page('remote'));

    expect(documentTitle(result.head)).toContain(
      m.workArrangementPage_remoteJobsCountHeading({
        count: MIN_JOBS_PER_INDEXED_PAGE,
        countLabel: String(MIN_JOBS_PER_INDEXED_PAGE),
      }),
    );
    expect(result.breadcrumbTrail.slice(2)).toEqual([
      { name: m.workArrangementPage_remoteJobsHeading() },
    ]);
  });

  it('lets the operator’s copy win on the plain view', async () => {
    mocks.placeResolve.mockResolvedValue({
      ...arrangementResolution('hybrid'),
      metaTitle: 'Fixture meta title',
      introHtml: '<p>Fixture intro</p>',
    });

    const result = await locationPage(page('hybrid'));

    expect(documentTitle(result.head)).toBe('Fixture meta title');
    expect(result.introHtml).toBe('<p>Fixture intro</p>');
  });

  it('links a combination back to its arrangement page', async () => {
    mocks.placeResolve.mockResolvedValue(arrangementResolution('on-site'));

    const result = await getJobsLocationSkillPage({
      data: { ...page('on-site'), skillSlug: 'fixture-term' },
    });

    if (result.kind !== 'ok') throw new Error('expected a listing');
    expect(result.breadcrumbTrail.slice(2)).toEqual([
      {
        name: m.workArrangementPage_onSiteJobsHeading(),
        href: '/jobs/locations/on-site',
      },
      { name: 'Fixture Term' },
    ]);
    expect(documentTitle(result.head)).toContain(
      m.workArrangementSkillPage_onSiteJobsCountHeading({
        count: MIN_JOBS_PER_INDEXED_PAGE,
        countLabel: String(MIN_JOBS_PER_INDEXED_PAGE),
        skill: 'Fixture Term',
      }),
    );
  });
});
