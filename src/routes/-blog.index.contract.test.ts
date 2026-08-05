import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { getBlogIndexPage } = vi.hoisted(() => ({
  getBlogIndexPage: vi.fn(),
}));

vi.mock('../server/blog-pages', () => ({
  getBlogIndexPage,
}));

import { Route as BlogRoute } from './blog.index';

function validateSearch(search: Record<string, unknown>) {
  const validate = BlogRoute.options.validateSearch;
  if (typeof validate !== 'function') {
    throw new Error('The blog route does not define search validation');
  }
  return validate(search);
}

function loader() {
  const load = BlogRoute.options.loader;
  if (typeof load !== 'function') {
    throw new Error('The blog route does not define a callable loader');
  }
  return load;
}

beforeEach(() => {
  getBlogIndexPage.mockReset();
  getBlogIndexPage.mockResolvedValue({
    page: { data: [], hasMore: true, nextCursor: '3' },
    tags: [],
    seo: {
      boardName: 'Sandbox',
      origin: 'https://board.example',
      language: 'en',
      labels: {},
    },
    q: null,
    head: {
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

  it('direct-loads the requested cursor page instead of page one', async () => {
    await loader()({ deps: { cursor: '2' } } as never);

    expect(getBlogIndexPage).toHaveBeenCalledWith({
      data: { cursor: '2', q: undefined },
    });
  });

  it('canonicalises every cursor page to the bare archive root, never the cursor URL', () => {
    const head = BlogRoute.options.head;
    if (typeof head !== 'function') {
      throw new Error('The blog route does not define a head descriptor');
    }

    const descriptor = head({
      loaderData: {
        page: { data: [], hasMore: true, nextCursor: '3' },
        tags: [],
        seo: {
          boardName: 'Sandbox',
          origin: 'https://board.example',
          language: 'en',
          labels: {},
        },
        q: null,
        head: {
          links: [{ rel: 'canonical', href: 'https://board.example/blog' }],
        },
      },
    } as never) as { links?: Array<{ rel?: string; href?: string }> };

    const canonical = descriptor.links?.find(
      (link) => link.rel === 'canonical',
    );

    expect(canonical?.href).toBe('https://board.example/blog');
    expect(canonical?.href).not.toContain('cursor');
  });
});
