// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
