import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

import { m } from '../paraglide/messages';

// The route module imports the Workers-backed query boundary. This contract
// exercises routing only, so keep the network boundary inert.
vi.mock('../server/queries', () => ({
  getBoardContext: vi.fn(),
  getSeoBase: vi.fn(),
  listBlogPosts: vi.fn(),
  listCompanies: vi.fn(),
  listJobs: vi.fn(),
  listTalent: vi.fn(),
  searchJobs: vi.fn(),
}));

import { Route } from './index';

describe('home route — landing contracts', () => {
  it('moves an old root jobs search to /jobs without losing its submitted intent', async () => {
    const validateSearch = Route.options.validateSearch;
    if (typeof validateSearch !== 'function') {
      throw new Error('The home route does not validate legacy jobs searches');
    }

    const search = validateSearch({
      q: 'designer',
      remoteOption: 'remote',
      employmentType: 'full_time',
      seniority: ['senior'],
      sort: 'newest',
      cursor: 'legacy-cursor',
    });
    const beforeLoad = Route.options.beforeLoad;

    if (typeof beforeLoad !== 'function') {
      throw new Error('The home route does not redirect legacy jobs searches');
    }

    let result: unknown;
    try {
      result = await beforeLoad({ search } as never);
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) return;

    expect(result.options).toMatchObject({
      to: '/jobs',
      replace: true,
      search: {
        q: 'designer',
        remoteOption: 'remote',
        employmentType: 'full_time',
        seniority: ['senior'],
        sort: 'newest',
      },
    });
  });

  it('describes the editorial landing rather than a jobs result count', async () => {
    const head = Route.options.head;
    if (typeof head !== 'function') {
      throw new Error('The home route does not define metadata');
    }

    const result = await head({
      loaderData: {
        page: { data: [], count: 42 },
        companies: [],
        posts: null,
        talent: null,
        seo: {
          boardName: 'Acme Careers',
          language: 'en',
          labels: undefined,
          origin: 'https://careers.acme.test',
        },
      },
    } as never);

    expect(result).toMatchObject({
      meta: expect.arrayContaining([
        { title: `${m.home_heroHeadline()} | Acme Careers` },
        { name: 'description', content: m.home_heroSupporting() },
      ]),
      links: [{ rel: 'canonical', href: 'https://careers.acme.test/' }],
    });
    expect(JSON.stringify(result)).not.toContain('42');
  });
});
