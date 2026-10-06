import { describe, expect, it, vi } from 'vitest';

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
vi.mock('./lib/board-access-middleware', () => ({ boardAccessMiddleware: {} }));
vi.mock('./server/board-access', () => ({
  gatedRead: <TResult>(
    _context: Record<string, never>,
    read: (headers: Record<string, string>) => TResult,
  ) => read({}),
}));
vi.mock('./lib/board-context-cache', () => ({
  readBoardContext: async () => ({ name: 'Fixture board', language: 'en' }),
}));
vi.mock('./lib/data-source.server', () => ({
  getDataSource: () => 'board',
}));
vi.mock('./lib/public-origin', () => ({
  readPublicOrigin: async () => 'https://fixture.example',
}));
vi.mock('./lib/board', () => ({
  getBoard: () => ({
    taxonomy: {
      places: {
        resolve: async () => ({
          canonicalSlug: 'london',
          displayName: 'London',
        }),
        list: async () => ({ data: [] }),
      },
      skills: {
        resolve: async () => ({
          canonicalSlug: 'typescript',
          displayName: 'TypeScript',
        }),
      },
    },
    jobs: { list: async () => ({ data: [], count: 0 }) },
  }),
}));

import { getJobsLocationSkillPage } from './server/jobs-listing-pages';

describe('canonical board paths', () => {
  it('returns a location and skill canonical without listing pagination', async () => {
    const page = await getJobsLocationSkillPage({
      data: {
        locationSlug: 'london',
        skillSlug: 'typescript',
        offset: 20,
        limit: 20,
      },
    });
    expect(page.kind).toBe('ok');
    if (page.kind !== 'ok') throw new Error('Expected a listing page');
    expect(page.head.links).toContainEqual({
      rel: 'canonical',
      href: 'https://fixture.example/jobs/locations/london/skills/typescript',
    });
  });
});
