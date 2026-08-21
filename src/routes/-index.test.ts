import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ env: {} }));

import { m } from '../paraglide/messages';

// The route module imports the Workers-backed home page boundary, and the
// landing still mounts JobAlertFloatingPrompt (which reaches queries.ts).
// This contract exercises routing only, so keep the network boundary inert.
vi.mock('../server/home-page', () => ({
  getHomePage: vi.fn(),
}));
vi.mock('../server/queries', () => ({
  subscribeJobAlert: vi.fn(),
  getBoardContext: vi.fn(),
  getSeoBase: vi.fn(),
}));
vi.mock('../server/account', () => ({
  saveJob: vi.fn(),
  getSessionUser: vi.fn(),
}));
vi.mock('../server/auth', () => ({
  confirmEmailChange: vi.fn(),
  forgotPassword: vi.fn(),
}));
vi.mock('../server/settings', () => ({
  getNotificationPreferences: vi.fn(),
  getSettingsAccount: vi.fn(),
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

  it('emits precomputed head meta + JSON-LD scripts rather than a jobs result count', async () => {
    const head = Route.options.head;
    if (typeof head !== 'function') {
      throw new Error('The home route does not define metadata');
    }

    const title = `${m.home_heroHeadline()} | Acme Careers`;
    const description = m.home_heroSupporting();
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
        head: {
          meta: [
            { title },
            { name: 'description', content: description },
            { property: 'og:title', content: title },
            { property: 'og:description', content: description },
            { property: 'og:type', content: 'website' },
            {
              property: 'og:url',
              content: 'https://careers.acme.test/',
            },
          ],
          links: [{ rel: 'canonical', href: 'https://careers.acme.test/' }],
        },
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: [],
          },
        ],
      },
    } as never);

    expect(result).toMatchObject({
      meta: expect.arrayContaining([
        { title },
        { name: 'description', content: description },
      ]),
      links: [{ rel: 'canonical', href: 'https://careers.acme.test/' }],
      scripts: [
        {
          type: 'application/ld+json',
          children: expect.stringContaining('ItemList'),
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('42');
  });
});
