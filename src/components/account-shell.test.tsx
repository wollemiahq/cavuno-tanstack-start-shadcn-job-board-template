// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AccountShell } from './account-shell';

afterEach(cleanup);

function renderShell() {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <AccountShell
        identity={{
          title: 'Acme Ventures',
          subtitle: 'acme.test',
          avatarUrl: null,
        }}
        nav={[
          { key: 'jobs', label: 'Jobs', to: '/' },
          { key: 'profile', label: 'Company profile', to: '/profile' },
        ]}
        active="jobs"
        rail={<p>Workspace tools</p>}
      >
        <h1>Open roles</h1>
      </AccountShell>
    ),
  });
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/profile',
    component: () => <h1>Profile destination</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, profileRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('AccountShell', () => {
  it('uses the shared shadcn page contract for a named employer workspace', async () => {
    const { container } = renderShell();

    expect(
      await screen.findByRole('heading', { name: 'Open roles' }),
    ).toBeVisible();
    expect(container.querySelector('[data-layout="page"]')).not.toHaveClass(
      'rhea-theme',
    );
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(
      container.querySelector('[data-slot="avatar-fallback"]'),
    ).toHaveTextContent('AV');

    const navigation = screen.getByRole('navigation', {
      name: 'Acme Ventures',
    });
    expect(
      within(navigation).getByRole('link', { name: 'Jobs' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(navigation).getByRole('link', { name: 'Company profile' }),
    ).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Workspace tools')).toBeVisible();
  });
});
