// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { useState } from 'react';

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

function renderPage(onPageChange = vi.fn()) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <TalentSearchPage
        candidates={[candidateVm]}
        q="engineer"
        skill="Mathematics"
        count={50}
        page={1}
        pageSize={24}
        language="en"
        onPageChange={onPageChange}
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
    onPageChange,
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

  it('paginates the directory with numbered, crawlable page links, not a cursor pager', async () => {
    const { onPageChange } = renderPage();

    // The talent directory is offset-paginated with a total, so the affordance
    // is numbered pages on the shared pagination primitive — each a crawlable
    // ?page= anchor. Page 1 of 50 at pageSize 24 spans three pages.
    const pageTwo = await screen.findByRole('link', {
      name: `${m.pagination_ariaLabel()} 2`,
    });
    expect(pageTwo).toHaveAttribute('href', '/?page=2');
    expect(screen.queryByText('Load more')).toBeNull();

    fireEvent.click(pageTwo);
    expect(onPageChange).toHaveBeenCalledWith(2);
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
          count={0}
          page={1}
          pageSize={24}
          language="en"
          onPageChange={vi.fn()}
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

const candidate2 = {
  object: 'talent_directory_entry',
  handle: 'grace-hopper',
  displayName: 'Grace Hopper',
  headline: 'Compiler pioneer',
  location: 'New York',
  avatarUrl: null,
  bio: null,
  jobSearchStatus: 'open_to_offers',
  skills: ['COBOL'],
  experiences: [],
  education: [],
} as TalentDirectoryEntry;
const candidateVm2 = toTalentCardVM(candidate2, getTalentSearchLabels());

describe('TalentSearchPage — results description line', () => {
  function renderPage(
    props: Partial<React.ComponentProps<typeof TalentSearchPage>>,
  ) {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <TalentSearchPage
          candidates={[candidateVm]}
          count={1}
          page={1}
          pageSize={24}
          language="en"
          onPageChange={vi.fn()}
          onSelectedTalentReplace={vi.fn()}
          onSelectedTalentPush={vi.fn()}
          detail={<p>Selected profile details</p>}
          {...props}
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
    return render(<RouterProvider router={router} />);
  }

  it('renders the exact "Showing X–Y of N" range on the first page (offset)', async () => {
    // The directory is offset-paginated with a total, so the line states the
    // precise range, never a fabricated cursor count.
    renderPage({
      candidates: [candidateVm, candidateVm2],
      count: 50,
      page: 1,
      pageSize: 24,
    });

    expect(
      await screen.findByText('Showing 1–24 of 50 candidates'),
    ).toBeVisible();
    expect(screen.queryByText(/more available/)).toBeNull();
  });

  it('advances the range window on a later page and caps it at the total', async () => {
    renderPage({
      candidates: [candidateVm, candidateVm2],
      count: 50,
      page: 3,
      pageSize: 24,
    });

    expect(
      await screen.findByText('Showing 49–50 of 50 candidates'),
    ).toBeVisible();
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
            count={1}
            page={1}
            pageSize={24}
            language="en"
            onPageChange={vi.fn()}
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
