// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { createElement } from 'react';

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
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobsNotFound } from './jobs-not-found';

vi.mock('@/paraglide/messages', () => ({
  m: {
    jobSearch_noMatchingResultsHeading: () => 'Fixture unavailable taxonomy',
    jobSearch_queryEmptyText: () => 'Fixture recovery help',
    jobSearch_resetFiltersAction: () => 'Fixture reset',
  },
}));
vi.mock('@/components/board/jobs-filter-controls', () => ({
  JobsFilterControls: ({
    onChange,
  }: {
    onChange: (next: { remote: string }) => void;
  }) =>
    createElement(
      'button',
      { onClick: () => onChange({ remote: 'remote' }) },
      'Fixture filter',
    ),
}));
afterEach(cleanup);
function mount() {
  const root = createRootRoute({
    loader: () => ({ board: { language: 'en' } }),
  });
  const missing = createRoute({
    getParentRoute: () => root,
    path: '/missing',
    component: JobsNotFound,
  });
  const jobs = createRoute({
    getParentRoute: () => root,
    path: '/jobs',
    component: () => createElement('p', null, 'Fixture browse destination'),
  });
  const router = createRouter({
    routeTree: root.addChildren([missing, jobs]),
    history: createMemoryHistory({
      initialEntries: ['/missing?page=4&selectedJob=stale'],
    }),
  });
  render(createElement(RouterProvider, { router }));
  return router;
}
describe('missing taxonomy recovery', () => {
  it('offers a working browse destination', async () => {
    mount();
    fireEvent.click(await screen.findByRole('link', { name: 'Fixture reset' }));
    expect(await screen.findByText('Fixture browse destination')).toBeVisible();
  });
  it('routes new filters to browse without stale page or selection', async () => {
    const router = mount();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Fixture filter' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/jobs'));
    expect(router.state.location.search).toEqual({ remote: 'remote' });
  });
});
