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
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TalentFilters } from './talent-filters';

import { parseTalentSearch } from '@/lib/talent-search';

afterEach(cleanup);

function renderFilters(search = '') {
  const rootRoute = createRootRoute();
  const talentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/talent/',
    validateSearch: parseTalentSearch,
    component: () => {
      const current = talentRoute.useSearch();
      return <TalentFilters search={current} />;
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([talentRoute]),
    history: createMemoryHistory({
      initialEntries: [search ? `/talent/${search}` : '/talent/'],
    }),
  });

  return {
    ...render(<RouterProvider router={router} />),
    router,
  };
}

describe('TalentFilters', () => {
  it('renders status, relocate, and sort without a keyword Search field', async () => {
    const { container } = renderFilters();

    expect(
      await screen.findByRole('combobox', { name: 'Job search status' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: 'Open to relocate' }),
    ).toBeTruthy();
    const sort = screen.getByRole('combobox', { name: 'Sort' });
    expect(sort).toHaveTextContent('Sort:');
    expect(sort).toHaveTextContent('Best Match');
    expect(
      container.querySelector("[data-slot='talent-filter-bar']"),
    ).not.toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByPlaceholderText('Name or headline')).toBeNull();
    expect(screen.queryByLabelText('Search')).toBeNull();
  });

  it('writes sort to the URL immediately', async () => {
    const { router } = renderFilters();

    fireEvent.click(await screen.findByRole('combobox', { name: 'Sort' }));
    const newest = screen.getByRole('option', { name: 'Newest' });
    fireEvent.pointerDown(newest, { pointerType: 'mouse' });
    fireEvent.click(newest);

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ sort: 'newest' }),
    );
  });
});
