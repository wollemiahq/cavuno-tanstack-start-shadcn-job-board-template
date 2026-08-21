// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The Search control is an anchor, so these tests read its `href` rather than
 * spying on `window.open`. The stand-in `Link` renders the same `to`/`params`/
 * `search` a real one would resolve, which is what lets a test assert the
 * destination the visitor would actually land on.
 */
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({
      to,
      params,
      search,
      children,
      ...props
    }: {
      to: string;
      params?: Record<string, string>;
      search?: Record<string, unknown>;
      children: ReactNode;
      target?: string;
      rel?: string;
      className?: string;
      'aria-label'?: string;
    }) => {
      let path = to;
      for (const [key, value] of Object.entries(params ?? {})) {
        path = path.replace(`$${key}`, value);
      }
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(search ?? {})) {
        if (value == null || value === '') continue;
        query.set(
          key,
          Array.isArray(value) ? JSON.stringify(value) : `${value}`,
        );
      }
      const qs = query.toString();
      return (
        <a href={qs ? `${path}?${qs}` : path} {...props}>
          {children}
        </a>
      );
    },
  };
});

import { parseListingFilters } from '@cavuno/board/filters';

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

function renderHeader(
  initialSearch: Parameters<typeof EmbedJobsHeader>[0]['initialSearch'] = {},
) {
  return render(
    <EmbedJobsHeader
      boardName="Acme Board"
      logoUrl={null}
      initialSearch={initialSearch}
      keywordSuggestions={keywordSuggestions}
      locationSuggestions={locationSuggestions}
    />,
  );
}

const searchLink = () =>
  screen.getByRole('link', { name: m.searchBar_searchAriaLabel() });

describe('EmbedJobsHeader', () => {
  it('renders the board name, keyword field, location field, filters control, and Search', () => {
    renderHeader();

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

  it('opens Search in a new tab, never in the iframe', () => {
    renderHeader();

    expect(searchLink()).toHaveAttribute('target', '_blank');
    // `noopener` without `noreferrer`: the board keeps the /embed/jobs
    // referrer for attribution on this control.
    expect(searchLink()).toHaveAttribute('rel', 'noopener');
  });

  it("seeds from the widget's own params so Search keeps the operator's scope", () => {
    renderHeader({
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

  it('searches on Enter, without a form that could reload the iframe', () => {
    renderHeader({ q: 'nurse' });

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

  it('leaves Enter alone on every control that is not a search field', () => {
    renderHeader({ q: 'nurse' });

    const clicked = vi.fn();
    searchLink().addEventListener('click', clicked);

    // These all activate on Enter by DEFAULT — they never call
    // preventDefault — so a container listener that only checks
    // `defaultPrevented` cancels them and searches instead, leaving each one
    // keyboard-dead.
    for (const control of [
      screen.getByRole('link', { name: 'Acme Board' }),
      screen.getByRole('button', {
        name: new RegExp(m.jobSearch_allFiltersLabel()),
      }),
    ]) {
      const event = createEvent.keyDown(control, { key: 'Enter' });
      fireEvent(control, event);
      expect(event.defaultPrevented).toBe(false);
    }

    expect(clicked).not.toHaveBeenCalled();
  });

  it('leaves Enter alone while the combobox is selecting a suggestion', () => {
    renderHeader();

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

  it('leaves Enter alone mid-IME-composition and on key repeat', () => {
    renderHeader({ q: 'nurse' });

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

  it('seeds only filters the destination can actually honour', () => {
    // `volunteer` filters the embed's own list but is not in the listing
    // filter vocabulary, so /jobs drops it. Seeding it would light the badge
    // over a Search that opens the unfiltered board.
    renderHeader({ employmentType: 'volunteer' });

    expect(
      screen.getByRole('button', {
        name: new RegExp(m.jobSearch_allFiltersLabel()),
      }),
    ).not.toHaveTextContent('1');
    expect(searchLink().getAttribute('href')).toBe('/jobs');
  });

  it('survives the destination filter parser', () => {
    renderHeader({ remoteOption: 'remote', employmentType: 'contract' });

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

  it('routes a picked taxonomy term to its programmatic page', () => {
    renderHeader();

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

  it('stages a location pick and a filter change without leaving the frame', () => {
    renderHeader();

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
