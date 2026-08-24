// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { parseListingFilters } from '@cavuno/board/filters';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmbedJobsHeader } from './embed-jobs-header';

import { m } from '@/paraglide/messages';

afterEach(() => {
  cleanup();
});

const keywordSuggestions = {
  suggestions: [
    { id: 'skill:react', type: 'skill' as const, slug: 'react', name: 'React' },
  ],
  loading: false,
  onQueryChange: () => {},
};

const locationSuggestions = {
  suggestions: [
    {
      id: 'p1',
      slug: 'london',
      name: 'London',
      contextLabel: 'United Kingdom',
      countryCode: 'GB',
      regionCode: null,
    },
  ],
  loading: false,
  onQueryChange: () => {},
};

async function renderHeader(
  initialSearch: Parameters<typeof EmbedJobsHeader>[0]['initialSearch'] = {},
) {
  const rootRoute = createRootRoute({
    component: () => (
      <EmbedJobsHeader
        boardName="Acme Board"
        logoUrl={null}
        initialSearch={initialSearch}
        keywordSuggestions={keywordSuggestions}
        locationSuggestions={locationSuggestions}
      />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

const searchLink = () =>
  screen.getByRole('link', { name: m.searchBar_searchAriaLabel() });

describe('EmbedJobsHeader', () => {
  it('renders the board name, keyword field, location field, filters control, and Search', async () => {
    await renderHeader();

    expect(screen.getByRole('link', { name: 'Acme Board' })).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: m.searchBar_keywordAriaLabel() }),
    ).toBeTruthy();
    expect(
      screen.getByRole('combobox', {
        name: m.locationCombobox_locationAriaLabel(),
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: new RegExp(m.jobSearch_allFiltersLabel()),
      }),
    ).toBeTruthy();
    expect(searchLink()).toBeTruthy();
  });

  it('opens Search in a new tab, never in the iframe', async () => {
    await renderHeader();

    expect(searchLink()).toHaveAttribute('target', '_blank');
    // `noopener` without `noreferrer`: the board keeps the /embed/jobs
    // referrer for attribution on this control.
    expect(searchLink()).toHaveAttribute('rel', 'noopener');
  });

  it("seeds from the widget's own params so Search keeps the operator's scope", async () => {
    await renderHeader({
      q: 'nurse',
      location: 'london',
      remoteOption: 'remote',
      employmentType: 'full_time',
    });

    expect(
      screen.getByRole('combobox', { name: m.searchBar_keywordAriaLabel() }),
    ).toHaveValue('nurse');
    // The filter badge has to agree with the list beneath it, or the widget
    // shows an unfiltered-looking header over filtered results.
    expect(
      screen.getByRole('button', {
        name: new RegExp(m.jobSearch_allFiltersLabel()),
      }),
    ).toHaveTextContent('2');

    const href = searchLink().getAttribute('href') ?? '';
    expect(href).toContain('/jobs/locations/london');
    expect(href).toContain('q=nurse');
    expect(href).toContain('remoteOption=remote');
    expect(href).toContain('employmentType=full_time');
  });

  it('searches on Enter, without a form that could reload the iframe', async () => {
    await renderHeader({ q: 'nurse' });

    // No <form>: a native submit fires before hydration and would reload the
    // widget with the operator's params gone.
    expect(document.querySelector('form')).toBeNull();

    const clicked = vi.fn();
    searchLink().addEventListener('click', clicked);
    fireEvent.keyDown(
      screen.getByRole('combobox', { name: m.searchBar_keywordAriaLabel() }),
      { key: 'Enter' },
    );

    expect(clicked).toHaveBeenCalledOnce();
  });

  it('leaves Enter alone on every control that is not a search field', async () => {
    await renderHeader({ q: 'nurse' });

    const clicked = vi.fn();
    searchLink().addEventListener('click', clicked);

    // Grabbed before the Sheet opens: it is modal, so the rest of the header
    // leaves the accessible tree once it is up.
    const identityLink = screen.getByRole('link', { name: 'Acme Board' });

    // Open the filter Sheet, so its contents are in the sweep. It portals to
    // the body but is still a React child of the container, so its Enter
    // events bubble to the same listener.
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(m.jobSearch_allFiltersLabel()),
      }),
    );

    // Everything focusable except the two text fields. Note the Workplace and
    // Type triggers are `<button role="combobox">`, so a role check alone does
    // NOT exclude them — they belong in this list, not the searching one.
    const controls = [
      identityLink,
      ...Array.from(
        document.querySelectorAll<HTMLElement>('button, [role="option"]'),
      ),
    ];
    expect(
      controls.filter((c) => c.getAttribute('role') === 'combobox').length,
    ).toBeGreaterThan(0);

    for (const control of controls) {
      // These activate on Enter by DEFAULT — they never call preventDefault —
      // so cancelling it here leaves each one keyboard-dead.
      const event = createEvent.keyDown(control, { key: 'Enter' });
      fireEvent(control, event);
      expect(event.defaultPrevented).toBe(false);
    }

    expect(clicked).not.toHaveBeenCalled();
  });

  it('leaves Enter alone while the combobox is selecting a suggestion', async () => {
    await renderHeader();

    const clicked = vi.fn();
    searchLink().addEventListener('click', clicked);

    const keyword = screen.getByRole('combobox', {
      name: m.searchBar_keywordAriaLabel(),
    });
    // Base UI marks Enter handled when it commits a highlighted suggestion.
    // Pins the invariant the handler leans on, so a library upgrade that
    // stopped doing it could not both select AND search in silence.
    const event = createEvent.keyDown(keyword, { key: 'Enter' });
    event.preventDefault();
    fireEvent(keyword, event);

    expect(clicked).not.toHaveBeenCalled();
  });

  it('leaves Enter alone mid-IME-composition and on key repeat', async () => {
    await renderHeader({ q: 'nurse' });

    const clicked = vi.fn();
    searchLink().addEventListener('click', clicked);
    const keyword = screen.getByRole('combobox', {
      name: m.searchBar_keywordAriaLabel(),
    });

    // Enter commits an IME candidate; it is not a search.
    fireEvent.keyDown(keyword, { key: 'Enter', isComposing: true });
    // A held key would otherwise open a tab per repeat.
    fireEvent.keyDown(keyword, { key: 'Enter', repeat: true });

    expect(clicked).not.toHaveBeenCalled();
  });

  it('seeds only filters the destination can actually honour', async () => {
    // `volunteer` filters the embed's own list but is not in the listing
    // filter vocabulary, so /jobs drops it. Seeding it would light the badge
    // over a Search that opens the unfiltered board.
    await renderHeader({ employmentType: 'volunteer' });

    expect(
      screen.getByRole('button', {
        name: new RegExp(m.jobSearch_allFiltersLabel()),
      }),
    ).not.toHaveTextContent('1');
    expect(searchLink().getAttribute('href')).toBe('/jobs');
  });

  it('survives the destination filter parser', async () => {
    await renderHeader({ remoteOption: 'remote', employmentType: 'contract' });

    const query = Object.fromEntries(
      new URLSearchParams(searchLink().getAttribute('href')?.split('?')[1]),
    );

    // The destination re-parses; a value that does not round-trip here is a
    // filter the visitor was shown but never got.
    expect(parseListingFilters(query)).toMatchObject({
      remoteOption: 'remote',
      employmentType: 'contract',
    });
  });

  it('routes a picked taxonomy term to its programmatic page', async () => {
    await renderHeader();

    const keyword = screen.getByRole('combobox', {
      name: m.searchBar_keywordAriaLabel(),
    });
    fireEvent.focus(keyword);
    fireEvent.input(keyword, {
      target: { value: 'rea' },
      inputType: 'insertText',
    });
    fireEvent.click(screen.getByRole('option', { name: /React/ }));

    // A skill must land on /jobs/skills/$skill, not a free-text /jobs?q=react —
    // the whole point of resolving the term rather than passing the string on.
    expect(searchLink()).toHaveAttribute('href', '/jobs/skills/react');
  });

  it('stages a location pick and a filter change without leaving the frame', async () => {
    await renderHeader();

    const location = screen.getByRole('combobox', {
      name: m.locationCombobox_locationAriaLabel(),
    });
    fireEvent.focus(location);
    fireEvent.input(location, {
      target: { value: 'Lon' },
      inputType: 'insertText',
    });
    fireEvent.click(screen.getByRole('option', { name: /London/ }));

    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(m.jobSearch_allFiltersLabel()),
      }),
    );
    fireEvent.click(
      screen.getByRole('combobox', {
        name: m.jobSearch_workplacePlaceholder(),
      }),
    );
    const remoteOption = screen.getByRole('option', { name: 'Remote' });
    fireEvent.pointerDown(remoteOption, { pointerType: 'mouse' });
    fireEvent.click(remoteOption);
    fireEvent.click(
      screen.getByRole('button', { name: m.jobSearch_applyFiltersLabel() }),
    );

    const href = searchLink().getAttribute('href') ?? '';
    expect(href).toContain('/jobs/locations/london');
    expect(href).toContain('remoteOption=remote');
  });
});
