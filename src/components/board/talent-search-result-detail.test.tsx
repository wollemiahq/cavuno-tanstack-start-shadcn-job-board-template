// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TalentSearchResultDetail } from './talent-search-result-detail';
import { profileVm } from './talent-ui-test-fixtures';

import type { TalentDetailCta } from '@/board/talent-view-model';
import { SearchResultDetail } from '@/components/search-results/search-results';

afterEach(cleanup);

// Anonymous/without-access: the Message CTA points at sign-in/pricing. The
// route no longer offers a separate "View profile" button — the NAME is the
// link to the canonical profile — so `viewProfile` is always null here.
const messageCta: TalentDetailCta = {
  message: {
    kind: 'link',
    label: 'Message',
    href: '/auth/sign-in?returnTo=%2Ftalent',
  },
  viewProfile: null,
};

const composerCta: TalentDetailCta = {
  message: {
    kind: 'compose',
    label: 'Message',
    candidateHandle: 'ada-lovelace',
  },
  viewProfile: null,
};

// Candidate viewer: candidates can't cold-message candidates, so no Message —
// and with the button gone, the pane renders no action controls at all.
const noActionsCta: TalentDetailCta = {
  message: null,
  viewProfile: null,
};

describe('TalentSearchResultDetail', () => {
  it('shows decision-complete public facts', () => {
    render(<TalentSearchResultDetail vm={profileVm} cta={messageCta} />);

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

  it('renders the Message action and links the candidate name to their profile', () => {
    const { container } = render(
      <TalentSearchResultDetail vm={profileVm} cta={messageCta} />,
    );

    const actions = container.querySelector<HTMLElement>(
      "[data-slot='talent-detail-actions']",
    );
    if (!actions) throw new Error('Talent detail actions were not rendered');

    const links = within(actions).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Message');
    expect(links[0]).toHaveAttribute(
      'href',
      '/auth/sign-in?returnTo=%2Ftalent',
    );
    expect(
      within(actions).queryByRole('link', { name: 'View profile' }),
    ).toBeNull();
    // The candidate's NAME is now the accessible route to their profile.
    expect(screen.getByRole('link', { name: 'Ada Lovelace' })).toHaveAttribute(
      'href',
      '/p/ada-lovelace',
    );
  });

  it('renders no action controls when the viewer earns no Message, keeping the name link to the profile', () => {
    const { container } = render(
      <TalentSearchResultDetail vm={profileVm} cta={noActionsCta} />,
    );

    expect(
      container.querySelector("[data-slot='talent-detail-actions']"),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: 'Message' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View profile' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Ada Lovelace' })).toHaveAttribute(
      'href',
      '/p/ada-lovelace',
    );
  });

  it('starts a conversation by handle and hands off to the returned thread', async () => {
    const onStartConversation = vi.fn().mockResolvedValue({
      ok: true,
      data: { conversationId: 'conversation-1' },
    });
    const onConversationStarted = vi.fn();
    render(
      <TalentSearchResultDetail
        vm={profileVm}
        cta={composerCta}
        onStartConversation={onStartConversation}
        onConversationStarted={onConversationStarted}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Message' }));
    expect(
      screen.getByRole('heading', { name: 'Message Ada Lovelace' }),
    ).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Send a message' }), {
      target: { value: '  Your work looks like a great fit.  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(onStartConversation).toHaveBeenCalledWith({
        candidateHandle: 'ada-lovelace',
        body: 'Your work looks like a great fit.',
      }),
    );
    expect(onConversationStarted).toHaveBeenCalledWith('conversation-1');
  });

  it('removes every profile action while preserved detail is read-only', () => {
    const { container } = render(
      <TalentSearchResultDetail
        vm={profileVm}
        cta={messageCta}
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
    // A read-only placeholder exposes no navigable name link either.
    expect(screen.queryByRole('link', { name: 'Ada Lovelace' })).toBeNull();
  });

  it('replaces the expanded identity with a compact identity and action at the hero boundary', async () => {
    const { container } = render(
      <SearchResultDetail label="Selected profile">
        <TalentSearchResultDetail vm={profileVm} cta={messageCta} />
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

    // The condensed swap is batched into a requestAnimationFrame so scroll
    // handlers do not thrash style→layout→style, so it is NOT applied by the
    // time fireEvent returns. Wait for the frame rather than asserting into
    // the gap.
    await waitFor(() =>
      expect(
        container.querySelector("[data-slot='search-detail-header']"),
      ).not.toBeNull(),
    );

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
    // The "View profile" button is gone from the pane; the name is the link.
    expect(
      within(compact).queryByRole('link', { name: 'View profile' }),
    ).toBeNull();
  });
});
