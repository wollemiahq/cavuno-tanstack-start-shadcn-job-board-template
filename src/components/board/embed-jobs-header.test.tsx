// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { buildLocation } = vi.hoisted(() => ({
  buildLocation: vi.fn(
    (dest: {
      to: string;
      params?: Record<string, string>;
      search?: Record<string, unknown>;
    }) => {
      let path = dest.to;
      for (const [key, value] of Object.entries(dest.params ?? {})) {
        path = path.replace(`$${key}`, value);
      }
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(dest.search ?? {})) {
        if (value == null || value === '') continue;
        if (Array.isArray(value)) {
          for (const item of value) params.append(key, String(item));
        } else {
          params.set(key, String(value));
        }
      }
      const query = params.toString();
      return { href: query ? `${path}?${query}` : path };
    },
  ),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: () => ({ buildLocation }),
    Link: ({
      to,
      children,
      ...props
    }: {
      to: string;
      children: ReactNode;
      target?: string;
      rel?: string;
      className?: string;
    }) => (
      <a href={typeof to === 'string' ? to : '/'} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock('@/routes/-use-keyword-suggestions', () => ({
  useKeywordSuggestions: () => ({
    suggestions: [
      {
        id: 'skill:react',
        type: 'skill',
        slug: 'react',
        name: 'React',
      },
    ],
    loading: false,
    onQueryChange: () => {},
  }),
}));

vi.mock('@/routes/-use-location-suggestions', () => ({
  useLocationSuggestions: () => ({
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
  }),
}));

import { EmbedJobsHeader } from './embed-jobs-header';

import { m } from '@/paraglide/messages';

afterEach(() => {
  cleanup();
});

function renderHeader() {
  return render(
    <EmbedJobsHeader boardName="Acme Board" logoUrl={null} locale="en" />,
  );
}

describe('EmbedJobsHeader', () => {
  beforeEach(() => {
    buildLocation.mockClear();
    vi.spyOn(window, 'open').mockReturnValue(null);
  });

  afterEach(() => {
    vi.mocked(window.open).mockRestore();
  });

  it('renders the board name, keyword field, location field, filters control, and Search button', () => {
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
      screen.getByRole('button', { name: m.jobSearch_allFiltersLabel() }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: m.searchBar_searchAriaLabel() }),
    ).toBeTruthy();
  });

  it('stages keyword, location, and filter changes until Search opens a tab', () => {
    renderHeader();
    const open = vi.mocked(window.open);

    const keyword = screen.getByRole('combobox', {
      name: m.searchBar_keywordAriaLabel(),
    });
    fireEvent.input(keyword, {
      target: { value: 'react' },
      inputType: 'insertText',
    });
    fireEvent.keyDown(keyword, { key: 'Escape' });
    expect(open).not.toHaveBeenCalled();

    const location = screen.getByRole('combobox', {
      name: m.locationCombobox_locationAriaLabel(),
    });
    fireEvent.focus(location);
    fireEvent.input(location, {
      target: { value: 'Lon' },
      inputType: 'insertText',
    });
    fireEvent.click(screen.getByRole('option', { name: /London/ }));
    fireEvent.keyDown(location, { key: 'Escape' });
    expect(open).not.toHaveBeenCalled();

    // Filters live behind the compact icon trigger — open the sheet, pick
    // Remote, apply. None of it may launch a tab.
    fireEvent.click(
      screen.getByRole('button', { name: m.jobSearch_allFiltersLabel() }),
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
    expect(open).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: m.searchBar_searchAriaLabel() }),
    );

    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(expect.any(String), '_blank', 'noopener');
    const href = String(open.mock.calls[0]?.[0]);
    expect(href).toContain('react');
    expect(href).toContain('london');
    expect(href).toContain('remote');
  });
});
