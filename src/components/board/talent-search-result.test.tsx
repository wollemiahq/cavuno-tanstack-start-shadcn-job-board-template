// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TalentSearchResult } from './talent-search-result';

import type { TalentCardVM } from '@/board/talent-view-model';

const vm: TalentCardVM = {
  id: 'bu_ada-lovelace',
  handle: 'ada-lovelace',
  detailHref: '/p/ada-lovelace',
  displayName: 'Ada Lovelace',
  avatarUrl: 'https://cdn.example/ada.jpg',
  avatarName: 'Ada Lovelace',
  headline: 'Computing pioneer',
  location: 'London, United Kingdom',
  jobSearchStatusLabel: 'Open to offers',
  skills: ['Analytical engines', 'Mathematics'],
  redacted: false,
};

afterEach(cleanup);

function renderResult(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/p/$handle',
    component: () => <h1>Profile</h1>,
  });
  const talentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/talent',
    component: () => <h1>Talent</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, profileRoute, talentRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('TalentSearchResult', () => {
  it('uses one canonical profile Link with visible selected state and real candidate facts', async () => {
    const { container } = renderResult(
      <TalentSearchResult vm={vm} selected />,
    );

    const link = await screen.findByRole('link', { name: /Ada Lovelace/i });
    expect(link).toHaveAttribute('href', '/p/ada-lovelace');
    expect(link).toHaveAttribute('aria-current', 'true');
    expect(
      container.querySelector("[data-slot='search-result-card']"),
    ).toHaveAttribute('data-selected', 'true');
    expect(screen.getByText('Computing pioneer')).toBeVisible();
    expect(screen.getByText('London, United Kingdom')).toBeVisible();
    expect(screen.getByText('Open to offers')).toBeVisible();
    expect(screen.getByText('Analytical engines')).toBeVisible();
    expect(container.querySelector("[data-slot='avatar']")).toBeInTheDocument();
  });

  it('keeps a trailing Save control above the card link without navigating', async () => {
    const onSave = vi.fn();
    renderResult(
      <TalentSearchResult
        vm={vm}
        saveSlot={
          <button type="button" aria-label="Save to job" onClick={onSave}>
            Save
          </button>
        }
      />,
    );
    await screen.findByRole('link', { name: /Ada Lovelace/i });

    fireEvent.click(screen.getByRole('button', { name: 'Save to job' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('keeps a candidate without a public handle visible but non-selectable', () => {
    const { container } = render(
      <TalentSearchResult
        vm={{
          ...vm,
          handle: null,
          detailHref: null,
          avatarUrl: null,
        }}
        selected
      />,
    );

    expect(screen.getByText('Ada Lovelace')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Ada Lovelace/i })).toBeNull();
    expect(
      container.querySelector("[data-slot='search-result-card']"),
    ).not.toHaveAttribute('data-selected', 'true');
    expect(screen.getByText('AL')).toBeVisible();

    fireEvent.click(
      container.querySelector("[data-slot='search-result-card']")!,
    );
  });

  it('renders a redacted card with the initials fallback and the name the API sent', async () => {
    const { container } = renderResult(
      <TalentSearchResult
        vm={{
          ...vm,
          displayName: 'Ada L',
          avatarName: 'Ada L',
          avatarUrl: null,
          headline: null,
          location: 'London, United Kingdom',
          jobSearchStatusLabel: null,
          skills: [],
          redacted: true,
          detailHref: '/p/bu_ada-lovelace',
        }}
      />,
    );

    expect(await screen.findByRole('link', { name: /Ada L/i })).toHaveAttribute(
      'href',
      '/p/bu_ada-lovelace',
    );
    expect(screen.getByText('AL')).toBeVisible();
    expect(screen.queryByText('Computing pioneer')).toBeNull();
    expect(screen.queryByText('Analytical engines')).toBeNull();
    expect(
      container.querySelector("[data-slot='search-result-card']"),
    ).toHaveAttribute('data-redacted', 'true');
  });

  it('omits optional candidate facts rather than inventing placeholders', async () => {
    renderResult(
      <TalentSearchResult
        vm={{
          ...vm,
          headline: null,
          location: null,
          jobSearchStatusLabel: null,
          skills: [],
        }}
      />,
    );
    await screen.findByRole('link', { name: /Ada Lovelace/i });

    expect(screen.queryByText('Computing pioneer')).toBeNull();
    expect(screen.queryByText('London, United Kingdom')).toBeNull();
    expect(screen.queryByText('Open to offers')).toBeNull();
    expect(screen.queryByText('Analytical engines')).toBeNull();
  });
});
