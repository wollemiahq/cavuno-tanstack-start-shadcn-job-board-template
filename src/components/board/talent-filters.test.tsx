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

    const status = await screen.findByRole('combobox', {
      name: 'Job search status',
    });
    const relocate = screen.getByRole('combobox', {
      name: 'Open to relocate',
    });
    expect(status).toHaveTextContent('Any status');
    expect(relocate).toHaveTextContent('Any relocation');
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

  it('describes the Filters sheet as candidate filters, not job results', async () => {
    renderFilters();

    fireEvent.click(await screen.findByRole('button', { name: 'Filters' }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    expect(sheet).toHaveTextContent(
      'Refine candidate results by status and relocation.',
    );
    expect(sheet).not.toHaveTextContent('Skill');
    expect(sheet).not.toHaveTextContent('Languages');
    expect(sheet).not.toHaveTextContent('Seniority');
    expect(sheet).not.toHaveTextContent('Work authorization');
    expect(sheet).not.toHaveTextContent('Interested role');
    expect(sheet).not.toHaveTextContent('Refine job results');
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
