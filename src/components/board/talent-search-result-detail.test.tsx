// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TalentSearchResultDetail } from './talent-search-result-detail';
import { profileVm } from './talent-ui-test-fixtures';

import { SearchResultDetail } from '@/components/search-results/search-results';

afterEach(cleanup);

describe('TalentSearchResultDetail', () => {
  it('shows decision-complete public facts and only the supported View profile action', () => {
    const { container } = render(<TalentSearchResultDetail vm={profileVm} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ada Lovelace' }),
    ).toBeVisible();
    expect(
      screen.getByText('I translate ambitious ideas into working systems.'),
    ).toBeVisible();
    expect(screen.getByText('Analytical engineer')).toBeVisible();
    expect(screen.getByText('Bachelor of Mathematics')).toBeVisible();
    expect(screen.getByText('Fluent')).toBeVisible();

    const actions = container.querySelector<HTMLElement>(
      "[data-slot='talent-detail-actions']",
    );
    expect(actions).not.toBeNull();
    if (!actions) throw new Error('Talent detail actions were not rendered');

    const actionLinks = within(actions).getAllByRole('link');
    expect(actionLinks).toHaveLength(1);
    expect(actionLinks[0]).toHaveAccessibleName('View profile');
    expect(actionLinks[0]).toHaveAttribute('href', '/p/ada-lovelace');
    expect(actionLinks[0]).not.toHaveAttribute('role', 'button');
    expect(
      within(actions).queryByRole('button', {
        name: /message|contact|save|apply/i,
      }),
    ).toBeNull();
    expect(
      container.querySelector('[data-slot="detail-hero-boundary"]'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Ada Lovelace')).toHaveLength(1);
  });

  it('removes every profile action while preserved detail is read-only', () => {
    const { container } = render(
      <TalentSearchResultDetail vm={profileVm} interactive={false} />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ada Lovelace' }),
    ).toBeVisible();
    expect(screen.getByText('Analytical engineer')).toBeVisible();
    expect(
      container.querySelector("[data-slot='talent-detail-actions']"),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: 'View profile' })).toBeNull();
  });

  it('replaces the expanded identity with a compact identity and action at the hero boundary', () => {
    const { container } = render(
      <SearchResultDetail label="Selected profile">
        <TalentSearchResultDetail vm={profileVm} />
      </SearchResultDetail>,
    );
    const detail = screen.getByRole('region', { name: 'Selected profile' });
    const expanded = container.querySelector<HTMLElement>(
      '[data-slot="detail-expanded-header"]',
    );
    const boundary = container.querySelector<HTMLElement>(
      '[data-slot="detail-hero-boundary"]',
    );
    if (!expanded || !boundary) {
      throw new Error('Talent detail hero was not rendered');
    }

    Object.defineProperty(boundary, 'offsetTop', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(detail, 'scrollTop', {
      configurable: true,
      value: 200,
      writable: true,
    });
    fireEvent.scroll(detail);

    const compact = container.querySelector<HTMLElement>(
      '[data-slot="talent-detail-compact-header"]',
    );
    if (!compact) throw new Error('Compact talent header was not rendered');
    expect(expanded).toHaveAttribute('aria-hidden', 'true');
    expect(within(compact).getByText('Ada Lovelace')).toBeVisible();
    expect(within(compact).getByText('Computing pioneer')).toBeVisible();
    expect(
      within(compact).getByRole('link', { name: 'View profile' }),
    ).toHaveAttribute('href', '/p/ada-lovelace');
  });
});
