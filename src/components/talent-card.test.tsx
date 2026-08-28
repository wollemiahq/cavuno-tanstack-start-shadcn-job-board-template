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

import { TalentCard } from './talent-card';

import type { TalentDirectoryEntry } from '@cavuno/board';

const candidate = {
  object: 'talent_directory_entry',
  id: 'bu_ada-lovelace',
  handle: 'ada-lovelace',
  displayName: 'Ada Lovelace',
  headline: 'Computing pioneer',
  location: 'London, United Kingdom',
  avatarUrl: null,
  summary: null,
  bio: null,
  jobSearchStatus: 'open_to_offers',
  skills: ['Mathematics', 'Analytical engines'],
  experiences: [],
  education: [],
} satisfies TalentDirectoryEntry;

afterEach(cleanup);

function renderCard(
  entry: TalentDirectoryEntry,
  { profileUnlocks = false }: { profileUnlocks?: boolean } = {},
) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <TalentCard candidate={entry} profileUnlocks={profileUnlocks} />
    ),
  });
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/p/$handle',
    component: () => <h1>Profile</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, profileRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('TalentCard', () => {
  it('uses owned shadcn Card, Avatar, and Badge primitives without losing profile facts', async () => {
    const { container } = renderCard(candidate);

    expect(
      await screen.findByRole('link', { name: 'Ada Lovelace' }),
    ).toHaveAttribute('href', '/p/ada-lovelace');
    expect(container.querySelector("[data-slot='card']")).toBeTruthy();
    expect(container.querySelector("[data-slot='avatar']")).toBeTruthy();
    expect(
      container.querySelector("[data-slot='avatar-fallback']"),
    ).toHaveTextContent('AL');
    expect(screen.getByText('Computing pioneer')).toBeVisible();
    expect(screen.getByText('London, United Kingdom')).toBeVisible();
    expect(
      screen.getByText('Mathematics').closest("[data-slot='badge']"),
    ).toBeTruthy();
    expect(
      screen.getByText('Analytical engines').closest("[data-slot='badge']"),
    ).toBeTruthy();
  });

  it('links a full card to the opaque /p/{id} route when the board sells unlocks', async () => {
    renderCard(candidate, { profileUnlocks: true });

    expect(
      await screen.findByRole('link', { name: 'Ada Lovelace' }),
    ).toHaveAttribute('href', '/p/bu_ada-lovelace');
  });

  it('keeps a candidate without a handle visible but unlinked', async () => {
    renderCard({ ...candidate, handle: null });

    expect(await screen.findByText('Ada Lovelace')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Ada Lovelace' })).toBeNull();
  });
});
