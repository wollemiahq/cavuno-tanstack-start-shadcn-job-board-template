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

import { PaginationLink } from './pagination';

afterEach(cleanup);

function renderLink(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const jobsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, jobsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('PaginationLink', () => {
  it('is a native link and forwards new-tab anchor attributes', async () => {
    renderLink(
      <PaginationLink
        href="/jobs?page=2"
        target="_blank"
        rel="noreferrer"
        isActive
      >
        Page 2
      </PaginationLink>,
    );

    const link = await screen.findByRole('link', { name: 'Page 2' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/jobs?page=2');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: 'Page 2' })).toBeNull();
  });
});
