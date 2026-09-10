import { describe, expect, it } from 'vitest';

import { toJobsLocationHierarchyCrumbs } from './jobs-location-hierarchy';

const australia = {
  id: 'au',
  parentId: null,
  slug: 'australia',
  name: 'Australia',
};
const nsw = {
  id: 'nsw',
  parentId: 'au',
  slug: 'new-south-wales',
  name: 'New South Wales',
};
const sydney = {
  id: 'syd',
  parentId: 'nsw',
  slug: 'sydney',
  name: 'Sydney',
};

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

  it('names the leaf from the resolved displayName, not the source-language tree', () => {
    expect(
      toJobsLocationHierarchyCrumbs([sydney, nsw, australia], {
        ...sydneyResolution,
        displayName: 'Sidney',
      })[2],
    ).toEqual({ name: 'Sidney' });
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
    const tree = [{ ...sydney, slug: 'sydney-de' }];
    const crumbs = toJobsLocationHierarchyCrumbs(tree, {
      sourceSlug: 'sydney',
      canonicalSlug: 'sydney-de',
      displayName: 'Sydney',
    });
    expect(crumbs).toEqual([{ name: 'Sydney' }]);
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
    const unslugged = { id: 'nsw', parentId: 'au', slug: null, name: 'NSW' };
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
    const a = { id: 'a', parentId: 'b', slug: 'a', name: 'A' };
    const b = { id: 'b', parentId: 'a', slug: 'b', name: 'B' };
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
