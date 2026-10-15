import { describe, expect, it } from 'vitest';

import {
  nameHeaderSearchLocation,
  reconcileHeaderSearchLocation,
  resolveHeaderRouteLabels,
  resolveHeaderSearchState,
} from './header-search';

describe('resolveHeaderRouteLabels', () => {
  it('keeps resolved taxonomy and place labels from a combined jobs route', () => {
    expect(
      resolveHeaderRouteLabels([
        { loaderData: undefined },
        {
          loaderData: {
            place: { displayName: 'Sydney, NSW' },
            category: { displayName: 'Mechanical Engineering' },
          },
        },
      ]),
    ).toEqual({
      location: 'Sydney, NSW',
      query: 'Mechanical Engineering',
    });
  });

  it('uses a resolved skill label when the route has no category', () => {
    expect(
      resolveHeaderRouteLabels([
        { loaderData: { skill: { displayName: 'Robotics' } } },
      ]),
    ).toEqual({ query: 'Robotics', location: undefined });
  });

  it('keeps the resolved company market label for the shared Companies search', () => {
    expect(
      resolveHeaderRouteLabels([
        {
          loaderData: {
            market: { displayName: 'Industrial Automation' },
          },
        },
      ]),
    ).toEqual({ query: 'Industrial Automation', location: undefined });
  });
});

describe('resolveHeaderSearchState', () => {
  it('prefills category and location routes from their resolved labels', () => {
    const state = resolveHeaderSearchState(
      '/jobs/locations/sydney-nsw/mechanical-engineering',
      {},
      'Sydney, NSW',
      'Mechanical Engineering',
    );

    expect(state).toMatchObject({
      query: 'Mechanical Engineering',
      location: { slug: 'sydney-nsw', name: 'Sydney, NSW' },
      term: {
        type: 'category',
        slug: 'mechanical-engineering',
        name: 'Mechanical Engineering',
      },
    });
  });

  it('prefills a canonical skill route as a skill term', () => {
    expect(
      resolveHeaderSearchState(
        '/jobs/skills/robotics',
        {},
        undefined,
        'Robotics',
      ),
    ).toMatchObject({
      query: 'Robotics',
      term: { type: 'skill', slug: 'robotics', name: 'Robotics' },
    });
  });

  it.each([
    { search: { q: 'robotics' }, expected: 'robotics' },
    { search: { query: 'robotics' }, expected: 'robotics' },
  ])('prefills free-text job search from $search', ({ search, expected }) => {
    expect(resolveHeaderSearchState('/jobs', search).query).toBe(expected);
  });

  it('lets an explicit free-text query replace the taxonomy label', () => {
    const state = resolveHeaderSearchState(
      '/jobs/mechanical-engineering',
      { query: 'robotics' },
      undefined,
      'Mechanical Engineering',
    );

    expect(state.query).toBe('robotics');
    expect(state.term).toBeNull();
  });

  it('prefills a company market route as the selected top-search suggestion', () => {
    expect(
      resolveHeaderSearchState(
        '/companies/markets/industrial-automation',
        {},
        undefined,
        'Industrial Automation',
      ),
    ).toMatchObject({
      query: 'Industrial Automation',
      market: {
        slug: 'industrial-automation',
        name: 'Industrial Automation',
      },
    });
  });

  it('prefills talent place from the query param and keyword from q', () => {
    expect(
      resolveHeaderSearchState('/talent', { place: 'berlin', q: 'ada' }),
    ).toMatchObject({
      query: 'ada',
      location: { slug: 'berlin', name: 'berlin' },
    });
  });

  it('sets talent location.slug from /talent?place=berlin', () => {
    expect(
      resolveHeaderSearchState('/talent', { place: 'berlin' }).location,
    ).toEqual({ slug: 'berlin', name: 'berlin' });
  });

  it('prefills talent query from /talent?q=ada', () => {
    expect(resolveHeaderSearchState('/talent', { q: 'ada' }).query).toBe('ada');
  });
});

describe('header location field after a route change', () => {
  const london = { slug: 'london-eng-united-kingdom', name: 'London' };
  const sanFrancisco = {
    slug: 'san-francisco-ca-united-states',
    name: 'San Francisco',
  };

  it.each([
    {
      scope: 'jobs',
      picked: london,
      route: resolveHeaderSearchState(`/jobs/locations/${london.slug}`, {}),
    },
    {
      scope: 'talent',
      picked: sanFrancisco,
      route: resolveHeaderSearchState('/talent', {
        place: sanFrancisco.slug,
      }),
    },
  ])(
    'keeps the picked $scope place name while the route only knows its slug',
    ({ picked, route }) => {
      expect(route.location).toEqual({ slug: picked.slug, name: picked.slug });
      const field = reconcileHeaderSearchLocation(picked, route.location);
      expect(field).toEqual(picked);
      // The route names nothing new, so the picked name stays.
      expect(nameHeaderSearchLocation(field, route.location)).toEqual(picked);
    },
  );

  it('fills in the route name for a place the field only knows by slug', () => {
    const route = resolveHeaderSearchState(
      '/jobs/locations/london-eng-united-kingdom/engineering',
      {},
      'London, England, United Kingdom',
    ).location;

    expect(
      nameHeaderSearchLocation({ slug: london.slug, name: london.slug }, route),
    ).toEqual(route);
    // A name already shown, or a different place the visitor picked since,
    // is left alone.
    expect(nameHeaderSearchLocation(london, route)).toEqual(london);
    expect(nameHeaderSearchLocation(sanFrancisco, route)).toEqual(sanFrancisco);
  });

  it('shows the route name when history moves to a different place', () => {
    const route = resolveHeaderSearchState(
      '/talent',
      { place: sanFrancisco.slug },
      'San Francisco, California, United States',
    ).location;

    expect(reconcileHeaderSearchLocation(london, route)).toEqual({
      slug: sanFrancisco.slug,
      name: 'San Francisco, California, United States',
    });
    expect(reconcileHeaderSearchLocation(london, null)).toBeNull();
  });

  it('takes the route name over a picked name once the route has one', () => {
    const route = resolveHeaderSearchState(
      `/jobs/locations/${london.slug}`,
      {},
      'London, England, United Kingdom',
    ).location;

    expect(reconcileHeaderSearchLocation(london, route)).toEqual(route);
    // Cold load: nothing typed yet, the route's name is the field's.
    expect(reconcileHeaderSearchLocation(null, route)).toEqual(route);
  });
});

describe('identity-aware fallback scope', () => {
  it('defaults to jobs off-section for candidates and signed-out viewers', () => {
    expect(resolveHeaderSearchState('/', {}).scope).toBe('jobs');
    expect(resolveHeaderSearchState('/me/saved', {}).scope).toBe('jobs');
  });

  it('employers default to talent off-section, but sections still win', () => {
    expect(
      resolveHeaderSearchState('/', {}, undefined, undefined, 'talent').scope,
    ).toBe('talent');
    expect(
      resolveHeaderSearchState('/companies', {}, undefined, undefined, 'talent')
        .scope,
    ).toBe('companies');
    expect(
      resolveHeaderSearchState('/blog', {}, undefined, undefined, 'talent')
        .scope,
    ).toBe('blog');
  });
});

describe('route-owned search scope', () => {
  it('uses the blog scope for the archive and nested blog routes', () => {
    expect(resolveHeaderSearchState('/blog', {}).scope).toBe('blog');
    expect(resolveHeaderSearchState('/blog/example-post', {}).scope).toBe(
      'blog',
    );
  });

  it('hides shared search on private shells without pinning header markup', () => {
    expect(resolveHeaderSearchState('/account', {}).visible).toBe(false);
    expect(resolveHeaderSearchState('/employers/dashboard', {}).visible).toBe(
      false,
    );
    expect(resolveHeaderSearchState('/jobs', {}).visible).toBe(true);
  });
});
