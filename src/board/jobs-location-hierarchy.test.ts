import { describe, expect, it } from 'vitest';

import { toJobsLocationHierarchyCrumbs } from './jobs-location-hierarchy';

/** A directory place on an English board: board-language fields equal source. */
const englishPlace = (place: {
  id: string;
  parentId: string | null;
  slug: string | null;
  name: string;
}) => ({ ...place, canonicalSlug: place.slug, displayName: place.name });

const australia = englishPlace({
  id: 'au',
  parentId: null,
  slug: 'australia',
  name: 'Australia',
});
const nsw = englishPlace({
  id: 'nsw',
  parentId: 'au',
  slug: 'new-south-wales',
  name: 'New South Wales',
});
const sydney = englishPlace({
  id: 'syd',
  parentId: 'nsw',
  slug: 'sydney',
  name: 'Sydney',
});

const sydneyResolution = {
  sourceSlug: 'sydney',
  canonicalSlug: 'sydney',
  displayName: 'Sydney',
};

describe('toJobsLocationHierarchyCrumbs', () => {
  it('orders the ancestor chain country → … → current with ancestors linked and the place terminal', () => {
    expect(
      toJobsLocationHierarchyCrumbs([sydney, nsw, australia], sydneyResolution),
    ).toEqual([
      { name: 'Australia', href: '/jobs/locations/australia' },
      { name: 'New South Wales', href: '/jobs/locations/new-south-wales' },
      { name: 'Sydney' },
    ]);
  });

  it('links the current place on combo pages (linkCurrent) via its canonical slug', () => {
    expect(
      toJobsLocationHierarchyCrumbs(
        [sydney, nsw, australia],
        sydneyResolution,
        {
          linkCurrent: true,
        },
      ),
    ).toEqual([
      { name: 'Australia', href: '/jobs/locations/australia' },
      { name: 'New South Wales', href: '/jobs/locations/new-south-wales' },
      { name: 'Sydney', href: '/jobs/locations/sydney' },
    ]);
  });

  it('scopes ancestor links to the caller axis while the leaf stays bare', () => {
    // On a location × keyword page the ancestors relax geography only — the
    // current place keeps its bare listing (a keyword-scoped leaf would be a
    // self-link to the page being rendered).
    expect(
      toJobsLocationHierarchyCrumbs(
        [sydney, nsw, australia],
        sydneyResolution,
        {
          linkCurrent: true,
          ancestorPath: (slug) => `/jobs/locations/${slug}/engineering`,
        },
      ),
    ).toEqual([
      { name: 'Australia', href: '/jobs/locations/australia/engineering' },
      {
        name: 'New South Wales',
        href: '/jobs/locations/new-south-wales/engineering',
      },
      { name: 'Sydney', href: '/jobs/locations/sydney' },
    ]);
  });

  it('names the leaf from the directory name, not the qualified displayName', () => {
    expect(
      toJobsLocationHierarchyCrumbs([sydney, nsw, australia], {
        ...sydneyResolution,
        displayName: 'Sydney, New South Wales, Australia',
      })[2],
    ).toEqual({ name: 'Sydney' });
  });

  it('finds the place by sourceSlug when the inbound slug was board-language canonical', () => {
    const crumbs = toJobsLocationHierarchyCrumbs([sydney, nsw, australia], {
      sourceSlug: 'sydney',
      canonicalSlug: 'sydney-de',
      displayName: 'Sydney',
    });
    expect(crumbs.map((c) => c.name)).toEqual([
      'Australia',
      'New South Wales',
      'Sydney',
    ]);
  });

  it('matches by canonicalSlug when the source slug is absent from the tree', () => {
    const tree = [{ ...sydney, slug: 'sydney-en', canonicalSlug: 'sydney-de' }];
    const crumbs = toJobsLocationHierarchyCrumbs(tree, {
      sourceSlug: 'sydney',
      canonicalSlug: 'sydney-de',
      displayName: 'Sydney',
    });
    expect(crumbs).toEqual([{ name: 'Sydney' }]);
  });

  describe('on a translated board', () => {
    const netherlands = {
      id: 'nl',
      parentId: null,
      slug: 'netherlands',
      canonicalSlug: 'nederland',
      name: 'Netherlands',
      displayName: 'Nederland',
    };
    const northHolland = {
      id: 'nh',
      parentId: 'nl',
      slug: 'north-holland',
      canonicalSlug: 'noord-holland',
      name: 'North Holland',
      displayName: 'Noord-Holland',
    };
    const hague = {
      id: 'dh',
      parentId: 'nh',
      slug: 'the-hague',
      canonicalSlug: 'den-haag',
      name: 'The Hague',
      displayName: 'Den Haag',
    };
    const tree = [hague, northHolland, netherlands];
    const expected = [
      { name: 'Nederland', href: '/jobs/locations/nederland' },
      { name: 'Noord-Holland', href: '/jobs/locations/noord-holland' },
      { name: 'Den Haag' },
    ];

    it('names and links ancestors in the board language', () => {
      expect(
        toJobsLocationHierarchyCrumbs(tree, {
          sourceSlug: 'the-hague',
          canonicalSlug: 'den-haag',
          displayName: 'Den Haag, Noord-Holland, Nederland',
        }),
      ).toEqual(expected);
    });

    it('finds the place when only the board-language slug matches', () => {
      expect(
        toJobsLocationHierarchyCrumbs(tree, {
          sourceSlug: 'den-haag',
          canonicalSlug: 'den-haag',
          displayName: 'Den Haag',
        }),
      ).toEqual(expected);
    });

    it('finds the place when only the source slug matches', () => {
      expect(
        toJobsLocationHierarchyCrumbs(tree, {
          sourceSlug: 'the-hague',
          canonicalSlug: 'the-hague',
          displayName: 'Den Haag',
        }),
      ).toEqual(expected);
    });
  });

  it('falls back to a single terminal crumb when the place is not in the tree', () => {
    expect(toJobsLocationHierarchyCrumbs([], sydneyResolution)).toEqual([
      { name: 'Sydney' },
    ]);
    expect(
      toJobsLocationHierarchyCrumbs([australia], sydneyResolution),
    ).toEqual([{ name: 'Sydney' }]);
  });

  it('falls back to a single LINKED crumb on combo pages when the tree misses', () => {
    expect(
      toJobsLocationHierarchyCrumbs([], sydneyResolution, {
        linkCurrent: true,
      }),
    ).toEqual([{ name: 'Sydney', href: '/jobs/locations/sydney' }]);
  });

  it('renders a slugless ancestor name-only rather than dropping it', () => {
    const unslugged = englishPlace({
      id: 'nsw',
      parentId: 'au',
      slug: null,
      name: 'NSW',
    });
    expect(
      toJobsLocationHierarchyCrumbs(
        [sydney, unslugged, australia],
        sydneyResolution,
      ),
    ).toEqual([
      { name: 'Australia', href: '/jobs/locations/australia' },
      { name: 'NSW' },
      { name: 'Sydney' },
    ]);
  });

  it('stops at a parent cycle instead of looping', () => {
    const a = englishPlace({ id: 'a', parentId: 'b', slug: 'a', name: 'A' });
    const b = englishPlace({ id: 'b', parentId: 'a', slug: 'b', name: 'B' });
    const crumbs = toJobsLocationHierarchyCrumbs([a, b], {
      sourceSlug: 'a',
      canonicalSlug: 'a',
      displayName: 'A',
    });
    expect(crumbs).toEqual([
      { name: 'B', href: '/jobs/locations/b' },
      { name: 'A' },
    ]);
  });
});
