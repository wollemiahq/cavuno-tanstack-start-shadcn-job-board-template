// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  CandidateAccountShell,
  type CandidateAccountNavigationItem,
} from './candidate-account-shell';

afterEach(cleanup);

const navigation: CandidateAccountNavigationItem[] = [
  { id: 'profile', label: 'Profile', href: '/account' },
  { id: 'saved', label: 'Saved jobs', href: '/account/saved' },
  { id: 'alerts', label: 'Job alerts', href: '/me/alerts' },
  { id: 'applications', label: 'Applications', href: '/me/applications' },
  { id: 'settings', label: 'Settings', href: '/settings' },
];

function renderWithRouter(element: React.ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => element,
  });
  const savedRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/account/saved',
    component: () => <h1>Saved jobs destination</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, savedRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return { router, ...render(<RouterProvider router={router} />) };
}

describe('CandidateAccountShell', () => {
  it('renders an accessible account navigation with stable link order and one current destination', async () => {
    renderWithRouter(
      <CandidateAccountShell
        identity={{
          title: 'Ada Lovelace',
          subtitle: 'ada@example.com',
          avatarUrl: null,
        }}
        navigation={navigation}
        navigationLabel="Candidate account"
        activeSection="saved"
      >
        <div>Saved jobs content</div>
      </CandidateAccountShell>,
    );

    const accountNavigation = await screen.findByRole('navigation', {
      name: 'Candidate account',
    });
    const links = within(accountNavigation).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual([
      'Profile',
      'Saved jobs',
      'Job alerts',
      'Applications',
      'Settings',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/account',
      '/account/saved',
      '/me/alerts',
      '/me/applications',
      '/settings',
    ]);

    const currentLinks = within(accountNavigation)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toHaveTextContent('Saved jobs');
  });

  it('owns the account page landmark while leaving headings to route content', async () => {
    const { container } = renderWithRouter(
      <CandidateAccountShell
        identity={{
          title: 'Ada Lovelace',
          subtitle: 'ada@example.com',
          avatarUrl: null,
        }}
        navigation={navigation}
        navigationLabel="Candidate account"
        activeSection="profile"
        rail={<div>Profile strength: 80%</div>}
      >
        <div>Profile editor</div>
      </CandidateAccountShell>,
    );

    expect(await screen.findByText('Ada Lovelace')).toBeVisible();
    expect(screen.getByText('ada@example.com')).toBeVisible();

    const sidebar = container.querySelector(
      '[data-slot="candidate-account-sidebar"]',
    );
    const content = container.querySelector(
      '[data-slot="candidate-account-content"]',
    );

    expect(sidebar).toBeInTheDocument();
    expect(content).toBeInTheDocument();
    expect(sidebar).toHaveTextContent('Profile strength: 80%');
    expect(content).toHaveTextContent('Profile editor');
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(
      sidebar!.compareDocumentPosition(content!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
  });

  it('navigates between account sections through TanStack Router without a document load', async () => {
    const { router } = renderWithRouter(
      <CandidateAccountShell
        identity={{ title: 'Ada Lovelace' }}
        navigation={navigation}
        navigationLabel="Candidate account"
        activeSection="profile"
      >
        <div>Profile editor</div>
      </CandidateAccountShell>,
    );

    fireEvent.click(await screen.findByRole('link', { name: 'Saved jobs' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/account/saved'),
    );
    expect(
      screen.getByRole('heading', { name: 'Saved jobs destination' }),
    ).toBeVisible();
  });
});
