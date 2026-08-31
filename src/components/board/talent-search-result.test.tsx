// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
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

describe('TalentSearchResult', () => {
  it('uses one canonical profile anchor with visible selected state and real candidate facts', () => {
    const onActivate = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) =>
      event.preventDefault(),
    );
    const { container } = render(
      <TalentSearchResult vm={vm} selected onActivate={onActivate} />,
    );

    const link = screen.getByRole('link', { name: /Ada Lovelace/i });
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

    fireEvent.click(link);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('keeps a trailing Save control above the card link without activating the candidate', () => {
    const onActivate = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) =>
      event.preventDefault(),
    );
    const onSave = vi.fn();
    render(
      <TalentSearchResult
        vm={vm}
        onActivate={onActivate}
        saveSlot={
          <button type="button" aria-label="Save to job" onClick={onSave}>
            Save
          </button>
        }
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save to job' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('keeps a candidate without a public handle visible but non-selectable', () => {
    const onActivate = vi.fn();
    const { container } = render(
      <TalentSearchResult
        vm={{
          ...vm,
          handle: null,
          detailHref: null,
          avatarUrl: null,
        }}
        selected
        onActivate={onActivate}
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
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('renders a redacted card with the initials fallback and the name the API sent', () => {
    const { container } = render(
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

    expect(screen.getByRole('link', { name: /Ada L/i })).toHaveAttribute(
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

  it('omits optional candidate facts rather than inventing placeholders', () => {
    render(
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

    expect(screen.queryByText('Computing pioneer')).toBeNull();
    expect(screen.queryByText('London, United Kingdom')).toBeNull();
    expect(screen.queryByText('Open to offers')).toBeNull();
    expect(screen.queryByText('Analytical engines')).toBeNull();
  });
});
