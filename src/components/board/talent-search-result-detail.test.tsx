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

import type { TalentDetailCta } from '@/board/talent-view-model';
import { SearchResultDetail } from '@/components/search-results/search-results';

afterEach(cleanup);

// Anonymous/without-access: Message points somewhere other than the profile,
// so both controls render (and are distinct).
const messageAndViewProfileCta: TalentDetailCta = {
  message: { label: 'Message', href: '/auth/sign-in?returnTo=%2Ftalent' },
  viewProfile: { label: 'View profile', href: '/p/ada-lovelace' },
};

// Candidate viewer: candidates can't cold-message candidates, so no Message.
const viewProfileOnlyCta: TalentDetailCta = {
  message: null,
  viewProfile: { label: 'View profile', href: '/p/ada-lovelace' },
};

describe('TalentSearchResultDetail', () => {
  it('shows decision-complete public facts', () => {
    render(
      <TalentSearchResultDetail
        vm={profileVm}
        cta={messageAndViewProfileCta}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ada Lovelace' }),
    ).toBeVisible();
    expect(
      screen.getByText('I translate ambitious ideas into working systems.'),
    ).toBeVisible();
    expect(screen.getByText('Analytical engineer')).toBeVisible();
    expect(screen.getByText('Bachelor of Mathematics')).toBeVisible();
    expect(screen.getByText('Fluent')).toBeVisible();
    expect(screen.getAllByText('Ada Lovelace')).toHaveLength(1);
  });

  it('renders the Message primary action ahead of the secondary View profile link', () => {
    const { container } = render(
      <TalentSearchResultDetail
        vm={profileVm}
        cta={messageAndViewProfileCta}
      />,
    );

    const actions = container.querySelector<HTMLElement>(
      "[data-slot='talent-detail-actions']",
    );
    if (!actions) throw new Error('Talent detail actions were not rendered');

    const links = within(actions).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAccessibleName('Message');
    expect(links[0]).toHaveAttribute(
      'href',
      '/auth/sign-in?returnTo=%2Ftalent',
    );
    expect(links[1]).toHaveAccessibleName('View profile');
    expect(links[1]).toHaveAttribute('href', '/p/ada-lovelace');
  });

  it('renders only the View profile link when the viewer earns no Message CTA', () => {
    const { container } = render(
      <TalentSearchResultDetail vm={profileVm} cta={viewProfileOnlyCta} />,
    );

    const actions = container.querySelector<HTMLElement>(
      "[data-slot='talent-detail-actions']",
    );
    if (!actions) throw new Error('Talent detail actions were not rendered');

    const links = within(actions).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('View profile');
    expect(within(actions).queryByRole('link', { name: 'Message' })).toBeNull();
  });

  it('removes every profile action while preserved detail is read-only', () => {
    const { container } = render(
      <TalentSearchResultDetail
        vm={profileVm}
        cta={messageAndViewProfileCta}
        interactive={false}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ada Lovelace' }),
    ).toBeVisible();
    expect(screen.getByText('Analytical engineer')).toBeVisible();
    expect(
      container.querySelector("[data-slot='talent-detail-actions']"),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: 'View profile' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Message' })).toBeNull();
  });

  it('replaces the expanded identity with a compact identity and action at the hero boundary', () => {
    const { container } = render(
      <SearchResultDetail label="Selected profile">
        <TalentSearchResultDetail
          vm={profileVm}
          cta={messageAndViewProfileCta}
        />
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
      '[data-slot="search-detail-header"]',
    );
    if (!compact) throw new Error('Compact talent header was not rendered');
    expect(expanded).toHaveAttribute('aria-hidden', 'true');
    // The condensed header's name links to the talent's /p/{handle} profile.
    expect(
      within(compact).getByRole('link', { name: 'Ada Lovelace' }),
    ).toHaveAttribute('href', '/p/ada-lovelace');
    expect(within(compact).getByText('Computing pioneer')).toBeVisible();
    expect(
      within(compact).getByRole('link', { name: 'Message' }),
    ).toHaveAttribute('href', '/auth/sign-in?returnTo=%2Ftalent');
    expect(
      within(compact).getByRole('link', { name: 'View profile' }),
    ).toHaveAttribute('href', '/p/ada-lovelace');
  });
});
