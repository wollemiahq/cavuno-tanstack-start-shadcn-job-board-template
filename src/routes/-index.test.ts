import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import { Route } from './index';

describe('home route — landing contracts', () => {
  it('moves an old root jobs search to /jobs without losing its submitted intent', async () => {
    const validateSearch = Route.options.validateSearch;
    if (!validateSearch) {
      throw new Error('The home route does not validate legacy jobs searches');
    }

    const searchInput = {
      q: 'designer',
      remoteOption: 'remote',
      employmentType: 'full_time',
      seniority: 'senior',
      sort: 'newest',
      cursor: 'legacy-cursor',
    };
    const search =
      'parse' in validateSearch
        ? validateSearch.parse(searchInput)
        : '~standard' in validateSearch
          ? (() => {
              throw new Error('The home route uses an unexpected async schema');
            })()
          : validateSearch(searchInput);
    const beforeLoad = Route.options.beforeLoad;

    if (!beforeLoad) {
      throw new Error('The home route does not redirect legacy jobs searches');
    }

    let result: unknown;
    try {
      result = beforeLoad({
        abortController: new AbortController(),
        preload: false,
        params: {},
        search,
        context: { origin: 'https://careers.acme.test' },
        location: {
          href: '/',
          pathname: '/',
          search,
          searchStr: '',
          state: { __TSR_index: 0 },
          hash: '',
          publicHref: '/',
          external: false,
        },
        navigate: () => {
          throw new Error('The home beforeLoad must redirect declaratively');
        },
        buildLocation: () => {
          throw new Error('The home beforeLoad must not build a location');
        },
        cause: 'enter',
        matches: [],
        routeId: '/',
      });
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
    if (!head) {
      throw new Error('The home route does not define metadata');
    }

    const title = `${m.home_heroHeadline()} | Acme Careers`;
    const description = m.home_heroSupporting();
    const loaderData: ReturnType<typeof Route.useLoaderData> = {
      page: {
        object: 'list',
        url: '/v1/jobs',
        data: [],
        count: 42,
        hasMore: false,
        nextCursor: null,
      },
      companies: [],
      companiesCount: 0,
      topCategories: [],
      posts: null,
      postsCount: null,
      talent: null,
      talentCount: null,
      seo: {
        boardName: 'Acme Careers',
        language: 'en',
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
    };
    const match = {
      id: '/',
      routeId: '/',
      fullPath: '/',
      index: 1,
      pathname: '/',
      params: {},
      _strictParams: {},
      status: 'success',
      isFetching: false,
      error: null,
      paramsError: null,
      searchError: null,
      updatedAt: Date.now(),
      _nonReactive: {},
      loaderData,
      context: { origin: 'https://careers.acme.test' },
      search: {},
      _strictSearch: {},
      fetchCount: 1,
      abortController: new AbortController(),
      cause: 'enter',
      loaderDeps: {},
      preload: false,
      invalid: false,
      staticData: { ownsMain: true },
    } satisfies Parameters<typeof head>[0]['match'];
    const result = await head({
      loaderData,
      match,
      matches: [match],
      params: {},
    });

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
