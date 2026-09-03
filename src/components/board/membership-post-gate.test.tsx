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

import { MembershipPostGate } from './membership-post-gate';

afterEach(cleanup);

type GateProps = React.ComponentProps<typeof MembershipPostGate>;

/** The gate renders typed `Link`s, so it mounts under a real router. */
async function renderGate(props: GateProps) {
  const rootRoute = createRootRoute();
  const children = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <MembershipPostGate {...props} />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/memberships',
      component: () => <h1>Memberships</h1>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/auth/sign-in',
      component: () => <h1>Sign in</h1>,
    }),
  ];
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const result = render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: 'Example Jobs' });
  return result;
}

describe('MembershipPostGate', () => {
  it('offers a signed-out visitor both roads, returning to the gated surface', async () => {
    await renderGate({ boardName: 'Example Jobs' });

    expect(
      screen.getByRole('link', { name: 'Become a member' }),
    ).toHaveAttribute('href', '/memberships');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth/sign-in?returnTo=%2Fpost',
    );
  });

  it('leaves a signed-in viewer only the membership road', async () => {
    await renderGate({ boardName: 'Example Jobs', signedIn: true });

    expect(screen.getByRole('link', { name: 'Become a member' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  it('invites the visitor to email for access when the board publishes an address', async () => {
    await renderGate({
      boardName: 'Example Jobs',
      contactEmail: 'members@example.com',
    });

    expect(
      screen.getByText('Need access? Email members@example.com.'),
    ).toBeVisible();
  });

  it('says nothing about email when the board publishes no address', async () => {
    await renderGate({ boardName: 'Example Jobs' });

    expect(screen.queryByText(/Need access/)).toBeNull();
  });
});
