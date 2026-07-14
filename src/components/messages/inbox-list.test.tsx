// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InboxList } from './inbox-list';

import type { Conversation } from '@cavuno/board';

const conversation: Conversation = {
  id: 'conversation-1',
  object: 'conversation',
  lastMessageAt: new Date().toISOString(),
  lastMessageSnippet: 'I’ll send the role details.',
  lastMessageAuthorBoardUserId: 'other-1',
  archivedAt: null,
  hasUnread: true,
  counterparty: {
    boardUserId: 'other-1',
    displayName: 'Hue Le',
    avatarUrl: null,
    companyName: 'Cavuno',
    handle: 'hue',
    companySlug: 'cavuno',
  },
};

describe('InboxList', () => {
  it('renders a selected, unread conversation and lets a dock controller select it', () => {
    const onSelect = vi.fn();

    render(
      <InboxList
        conversations={[conversation]}
        archived={false}
        selectedConversationId={conversation.id}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const row = screen.getByRole('button', { name: /Hue Le · Cavuno/ });
    expect(row).toHaveAttribute('data-slot', 'item');
    expect(row.querySelector('[data-slot="item-media"]')).not.toBeNull();
    expect(row.querySelector('[data-slot="item-content"]')).not.toBeNull();
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(row).toHaveClass('bg-muted');
    expect(screen.getByLabelText('Unread')).toBeInTheDocument();

    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(conversation.id);
  });

  it('uses the shared empty-state composition when the inbox has no conversations', () => {
    render(
      <InboxList
        conversations={[]}
        archived={false}
        hasMore={false}
        loadingMore={false}
        onLoadMore={vi.fn()}
        emptyText="No matching conversations"
      />,
    );

    const empty = screen
      .getByText('No matching conversations')
      .closest('[data-slot="empty"]');
    expect(empty).not.toBeNull();
    expect(empty).toHaveAttribute('data-test', 'inbox-empty');
  });

  it('hydrates inbox dates when the server and browser use different timezones', async () => {
    const originalTimezone = process.env.TZ;
    const datedConversation = {
      ...conversation,
      lastMessageAt: '2026-06-01T23:30:00.000Z',
    };
    const props = {
      conversations: [datedConversation],
      archived: false,
      hasMore: false,
      loadingMore: false,
      onLoadMore: vi.fn(),
      onSelect: vi.fn(),
    };

    process.env.TZ = 'UTC';
    const serverHtml = renderToString(<InboxList {...props} />);
    process.env.TZ = 'Australia/Sydney';

    const container = document.createElement('div');
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const root = hydrateRoot(container, <InboxList {...props} />);

    await act(async () => undefined);

    expect(consoleError.mock.calls.flat().map(String).join('\n')).not.toContain(
      'Hydration failed',
    );

    await act(async () => root.unmount());
    consoleError.mockRestore();
    container.remove();
    process.env.TZ = originalTimezone;
  });
});
