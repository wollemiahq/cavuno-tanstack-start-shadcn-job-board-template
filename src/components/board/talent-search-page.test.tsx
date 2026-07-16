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
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentSearchPage } from './talent-search-page';

import type { TalentDirectoryEntry } from '@cavuno/board';

const candidate = {
  object: 'talent_directory_entry',
  handle: 'ada-lovelace',
  displayName: 'Ada Lovelace',
  headline: 'Computing pioneer',
  location: 'London',
  avatarUrl: null,
  bio: null,
  jobSearchStatus: 'open_to_offers',
  skills: ['Mathematics'],
  experiences: [],
  education: [],
} as TalentDirectoryEntry;

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(cleanup);

function renderPage(onNextResults = vi.fn()) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <TalentSearchPage
        candidates={[candidate]}
        q="engineer"
        skill="Mathematics"
        hasMore
        onNextResults={onNextResults}
        selectedTalent="ada-lovelace"
        onSearchSubmit={vi.fn()}
        onSelectedTalentReplace={vi.fn()}
        onSelectedTalentPush={vi.fn()}
        detail={<p>Selected profile details</p>}
        startAd={{ label: 'Sponsored start', content: <p>Start creative</p> }}
        endAd={{ label: 'Sponsored end', content: <p>End creative</p> }}
      />
    ),
  });
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/p/$handle',
    component: () => <p>Full profile</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, profileRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return { ...render(<RouterProvider router={router} />), onNextResults };
}

describe('TalentSearchPage — search results pattern', () => {
  it('uses the same condensed results shell as Jobs and Companies', async () => {
    const { container } = renderPage();

    await screen.findByRole('main');
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Candidates',
    );
    expect(screen.queryByRole('searchbox', { name: /candidate/i })).toBeNull();
    expect(screen.getByRole('textbox', { name: /skill/i })).toHaveValue(
      'Mathematics',
    );
    expect(
      container.querySelector("[data-slot='talent-search-form']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-slot='talent-filter-bar']"),
    ).not.toBeNull();
    expect(
      container.querySelector("[data-slot='search-results-layout']"),
    ).not.toBeNull();

    const results = screen.getByRole('region', { name: 'Talent results' });
    expect(
      within(results).getByRole('link', { name: /Ada Lovelace/i }),
    ).toHaveAttribute('href', '/p/ada-lovelace');
    expect(
      screen.getByRole('region', { name: 'Selected profile' }),
    ).toHaveTextContent('Selected profile details');
    expect(
      screen.getByRole('complementary', { name: 'Sponsored start' }),
    ).toBeVisible();
    expect(
      screen.getByRole('complementary', { name: 'Sponsored end' }),
    ).toBeVisible();
  });

  it('uses an honest cursor replacement action', async () => {
    const { onNextResults } = renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Next results' }),
    );
    expect(onNextResults).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Load more')).toBeNull();
  });

  it('keeps a filtered no-match state inside the sponsored workspace and offers a primary reset', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <TalentSearchPage
          candidates={[]}
          q="no-such-candidate"
          skill="Cobol"
          onSearchSubmit={vi.fn()}
          onSelectedTalentReplace={vi.fn()}
          onSelectedTalentPush={vi.fn()}
          detail={<p>Unused talent detail</p>}
          startAd={{ label: 'Sponsored start', content: <p>Start creative</p> }}
          endAd={{ label: 'Sponsored end', content: <p>End creative</p> }}
        />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    const { container } = render(<RouterProvider router={router} />);

    expect(
      await screen.findByText('No candidates match these filters.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Reset filters' })).toHaveAttribute(
      'href',
      '/talent',
    );
    expect(
      container.querySelector("[data-slot='search-results-layout']"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Sponsored start' }),
    ).toHaveTextContent('Start creative');
    expect(
      screen.getByRole('complementary', { name: 'Sponsored end' }),
    ).toHaveTextContent('End creative');
    expect(screen.queryByText('Unused talent detail')).toBeNull();
  });
});
