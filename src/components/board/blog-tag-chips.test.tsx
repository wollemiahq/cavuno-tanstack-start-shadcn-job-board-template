// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BlogTagChips } from './blog-tag-chips';

import type { PublicBlogTag } from '@cavuno/board';

const tags = [
  {
    id: 'tag-design',
    object: 'public_blog_tag',
    name: 'Design systems',
    slug: 'design-systems',
    description: null,
  },
  {
    id: 'tag-hiring',
    object: 'public_blog_tag',
    name: 'Hiring',
    slug: 'hiring',
    description: null,
  },
] satisfies PublicBlogTag[];

afterEach(cleanup);

function renderChips(element: React.ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => element,
  });
  const route = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      route('/blog'),
      route('/blog/tag/$tagSlug'),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('BlogTagChips — shared blog topic row', () => {
  it('renders All plus every tag as real anchors with canonical hrefs', async () => {
    renderChips(<BlogTagChips tags={tags} allActive />);

    expect(
      await screen.findByRole('navigation', { name: 'Article topics' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute(
      'href',
      '/blog',
    );
    expect(
      screen.getByRole('link', { name: 'Design systems' }),
    ).toHaveAttribute('href', '/blog/tag/design-systems');
    expect(screen.getByRole('link', { name: 'Hiring' })).toHaveAttribute(
      'href',
      '/blog/tag/hiring',
    );
  });

  it('marks All active on the index in the default (primary) treatment', async () => {
    renderChips(<BlogTagChips tags={tags} allActive />);

    const all = await screen.findByRole('link', { name: 'All' });
    expect(all).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('link', { name: 'Design systems' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('lifts the current tag into the active treatment and interlinks the rest', async () => {
    renderChips(<BlogTagChips tags={tags} activeTagSlug="design-systems" />);

    const current = await screen.findByRole('link', { name: 'Design systems' });
    expect(current).toHaveAttribute('aria-current', 'page');

    // Every other tag remains an anchor to its own archive.
    const other = screen.getByRole('link', { name: 'Hiring' });
    expect(other).not.toHaveAttribute('aria-current');
    expect(other).toHaveAttribute('href', '/blog/tag/hiring');

    // "All" points back to the index and is not active on a tag page.
    const all = screen.getByRole('link', { name: 'All' });
    expect(all).toHaveAttribute('href', '/blog');
    expect(all).not.toHaveAttribute('aria-current');
  });
});
