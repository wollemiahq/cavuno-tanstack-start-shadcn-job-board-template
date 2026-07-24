import { describe, expect, it } from 'vitest';

import {
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
