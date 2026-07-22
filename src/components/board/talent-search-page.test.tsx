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
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TalentSearchPage } from './talent-search-page';

import { getTalentSearchLabels } from '@/board/talent-search-labels';
import { toTalentCardVM } from '@/board/talent-view-model';
import { m } from '@/paraglide/messages';
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

// The page now takes resolved `TalentCardVM[]`; the test maps the wire
// fixture exactly as the route does.
const candidateVm = toTalentCardVM(candidate, getTalentSearchLabels());

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

function renderPage(onNextResults = vi.fn(), onPreviousResults = vi.fn()) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <TalentSearchPage
        candidates={[candidateVm]}
        q="engineer"
        skill="Mathematics"
        hasPreviousResults
        nextCursor="cursor-page-2"
        onPreviousResults={onPreviousResults}
        onNextResults={onNextResults}
        selectedTalent="ada-lovelace"
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

  return {
    ...render(<RouterProvider router={router} />),
    onNextResults,
    onPreviousResults,
  };
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
    // The redundant in-page skill box is gone (ADR-0075): the header owns
    // the candidate query; `?skill=` still filters via the loader.
    expect(screen.queryByRole('textbox', { name: /skill/i })).toBeNull();
    expect(
      container.querySelector("[data-slot='talent-filter-bar']"),
    ).toBeNull();
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

  it('paginates the cursor directory with a design-system Previous/Next pager, not numbered pages', async () => {
    const { onNextResults, onPreviousResults } = renderPage();

    // The talent SDK surface is cursor-only (no total count, no offset), so
    // the affordance is Previous/Next on the shared pagination primitive — a
    // crawlable next anchor, no numbered page links.
    const next = await screen.findByRole('link', {
      name: m.pagination_nextPageLabel(),
    });
    expect(next).toHaveAttribute('href', '/?cursor=cursor-page-2');
    expect(
      screen.queryByRole('link', { name: `${m.pagination_ariaLabel()} 2` }),
    ).toBeNull();
    expect(screen.queryByText('Load more')).toBeNull();

    fireEvent.click(next);
    expect(onNextResults).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('link', { name: m.pagination_previousPageLabel() }),
    );
    expect(onPreviousResults).toHaveBeenCalledTimes(1);
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

describe('TalentSearchPage — arrival scroll', () => {
  // jsdom ships no scrollIntoView; the hook guards on its presence, so provide
  // a spy to observe the arrival alignment.
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  function renderArrival(initialSelected?: string) {
    function ArrivalHarness() {
      const [selected, setSelected] = useState(initialSelected);
      return (
        <>
          <button type="button" onClick={() => setSelected('ada-lovelace')}>
            select-ada
          </button>
          <TalentSearchPage
            candidates={[candidateVm]}
            onSelectedTalentReplace={vi.fn()}
            onSelectedTalentPush={vi.fn()}
            selectedTalent={selected}
            detail={<p>Selected profile details</p>}
          />
        </>
      );
    }
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: ArrivalHarness,
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
    return render(<RouterProvider router={router} />);
  }

  it('scrolls the URL-selected row to the top on arrival', async () => {
    renderArrival('ada-lovelace');

    await screen.findByRole('main');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    const target = scrollIntoView.mock.instances[0] as HTMLElement;
    expect(target.getAttribute('data-result-id')).toBe('ada-lovelace');
  });

  it('does not scroll a manual selection made after arrival', async () => {
    renderArrival(undefined);

    await screen.findByRole('main');
    expect(scrollIntoView).not.toHaveBeenCalled();

    // A post-mount selection (as from an in-page click) must not yank the list.
    fireEvent.click(screen.getByRole('button', { name: 'select-ada' }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
