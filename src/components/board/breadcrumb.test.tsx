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

import { ShellBreadcrumb } from './breadcrumb';

afterEach(cleanup);

describe('ShellBreadcrumb', () => {
  it('renders the supplied trail as breadcrumb navigation', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <ShellBreadcrumb
          ariaLabel="Breadcrumbs"
          items={[
            { name: 'Home', href: '/' },
            { name: 'Region' },
            { name: 'Jobs' },
          ]}
        />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    render(<RouterProvider router={router} />);

    const navigation = await screen.findByRole('navigation', {
      name: 'Breadcrumbs',
    });
    expect(navigation).toContainElement(
      screen.getByRole('link', { name: 'Home' }),
    );
    expect(screen.getByText('Jobs')).toHaveAttribute('aria-current', 'page');
    // An unlinked crumb before the last is plain text, not the current page.
    expect(screen.getByText('Region')).not.toHaveAttribute('aria-current');
  });
});
