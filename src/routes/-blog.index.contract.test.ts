import { isNotFound } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBlogIndexLoader,
  type BlogIndexPageLoader,
} from './-blog-index-loader';
import { Route as BlogRoute } from './blog.index';

import type { UrlSearchInput } from '../lib/pagination';
import { m } from '@/paraglide/messages';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const getBlogIndexPage = vi.fn<BlogIndexPageLoader>();

function validateSearch(search: UrlSearchInput) {
  const validate = BlogRoute.options.validateSearch;
  if (!validate) {
    throw new Error('The blog route does not define search validation');
  }
  if ('parse' in validate) return validate.parse(search);
  if ('~standard' in validate) {
    throw new Error('The blog route uses an unexpected async schema');
  }
  return validate(search);
}

function blogLoaderContext(deps: { cursor?: string; q?: string }) {
  const pathname = '/blog';
  return {
    abortController: new AbortController(),
    preload: false,
    params: {},
    deps,
    context: { origin: 'https://board.example' },
    location: {
      href: pathname,
      pathname,
      search: {},
      searchStr: '',
      state: { __TSR_index: 0 },
      hash: '',
      publicHref: pathname,
      external: false,
    },
    navigate: vi.fn(),
    parentMatchPromise: new Promise<never>(() => undefined),
    cause: 'enter' as const,
    route: BlogRoute,
  };
}

beforeEach(() => {
  getBlogIndexPage.mockReset();
  getBlogIndexPage.mockResolvedValue({
    page: {
      object: 'list',
      url: '/v1/blog',
      data: [],
      count: 0,
      limit: 12,
      offset: 0,
      hasMore: true,
      nextCursor: '3',
    },
    tags: [],
    seo: {
      boardName: 'Sandbox',
      origin: 'https://board.example',
      language: 'en',
    },
    q: null,
    head: {
      meta: [
        { title: 'Blog · Sandbox' },
        {
          name: 'description',
          content: m.blogIndex_metaDescription({ boardName: 'Sandbox' }),
        },
      ],
      links: [{ rel: 'canonical', href: 'https://board.example/blog' }],
    },
    jsonLd: [],
  });
});

describe('blog index presentation contract', () => {
  it('does not append the job-alert acquisition band to the editorial archive', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/blog.index.tsx'),
      'utf8',
    );

    expect(source).not.toContain('AlertsBand');
    expect(source).not.toContain('subscribeJobAlert');
  });
});

describe('blog index cursor pagination contract', () => {
  it('coerces a numeric-looking cursor (the router parses `?cursor=2` as a number) back to a string', () => {
    // A bare `?cursor=2` document load hands validateSearch the NUMBER 2; the
    // cursor must survive as a string instead of being dropped and 307-ing the
    // page URL back to the archive root.
    expect(validateSearch({ cursor: 2 })).toEqual({
      cursor: '2',
      q: undefined,
    });
    expect(validateSearch({ cursor: 'kn7abc' })).toEqual({
      cursor: 'kn7abc',
      q: undefined,
    });
  });

  it('does not serve the archive when blog is disabled', async () => {
    try {
      await createBlogIndexLoader(
        getBlogIndexPage,
        async () => false,
      )(blogLoaderContext({}));
      throw new Error('expected the archive not to load');
    } catch (error) {
      expect(isNotFound(error)).toBe(true);
    }
    expect(getBlogIndexPage).not.toHaveBeenCalled();
  });

  it('direct-loads the requested cursor page instead of page one', async () => {
    await createBlogIndexLoader(getBlogIndexPage)(
      blogLoaderContext({ cursor: '2' }),
    );

    expect(getBlogIndexPage).toHaveBeenCalledWith({
      data: { cursor: '2', q: undefined },
    });
  });

  it('canonicalises every cursor page to the bare archive root, never the cursor URL', async () => {
    const head = BlogRoute.options.head;
    if (!head) {
      throw new Error('The blog route does not define a head descriptor');
    }

    const loaderData: ReturnType<typeof BlogRoute.useLoaderData> = {
      page: {
        object: 'list',
        url: '/v1/blog',
        data: [],
        count: 0,
        limit: 12,
        offset: 0,
        hasMore: true,
        nextCursor: '3',
      },
      tags: [],
      seo: {
        boardName: 'Sandbox',
        origin: 'https://board.example',
        language: 'en',
      },
      q: null,
      head: {
        meta: [
          { title: 'Blog · Sandbox' },
          {
            name: 'description',
            content: m.blogIndex_metaDescription({ boardName: 'Sandbox' }),
          },
        ],
        links: [{ rel: 'canonical', href: 'https://board.example/blog' }],
      },
      jsonLd: [],
    };
    const match = {
      id: '/blog/',
      routeId: '/blog/',
      fullPath: '/blog/',
      index: 1,
      pathname: '/blog',
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
      context: { origin: 'https://board.example' },
      search: {},
      _strictSearch: {},
      fetchCount: 1,
      abortController: new AbortController(),
      cause: 'enter',
      loaderDeps: {},
      preload: false,
      invalid: false,
      staticData: { fullBleed: true, ownsMain: true },
    } satisfies Parameters<typeof head>[0]['match'];
    const descriptor = await head({
      loaderData,
      match,
      matches: [match],
      params: {},
    });

    const canonical = descriptor.links?.find(
      (link) => link?.rel === 'canonical',
    );

    expect(canonical?.href).toBe('https://board.example/blog');
    expect(canonical?.href).not.toContain('cursor');
  });
});
