// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BlockedController,
  InboxController,
  ThreadController,
} from './-messages-runtime';

import { useVisiblePoll } from '@/lib/use-visible-poll';
import { getInbox, markRead, unblockUser } from '@/server/messaging';
import type {
  BlockedUser,
  Conversation,
  ConversationDetail,
} from '@cavuno/board';

vi.mock('@/lib/use-visible-poll', () => ({ useVisiblePoll: vi.fn() }));

vi.mock('@/server/messaging', () => ({
  archiveConversation: vi.fn(),
  blockUser: vi.fn(),
  editMessage: vi.fn(),
  getInbox: vi.fn(),
  getThread: vi.fn(),
  markRead: vi.fn(),
  reportMessage: vi.fn(),
  sendReply: vi.fn(),
  unarchiveConversation: vi.fn(),
  unblockUser: vi.fn(),
  unsendMessage: vi.fn(),
}));

const conversation: Conversation = {
  id: 'conversation-1',
  object: 'conversation',
  lastMessageAt: '2026-07-14T05:00:00.000Z',
  lastMessageSnippet: 'Latest reply',
  lastMessageAuthorBoardUserId: 'candidate-1',
  archivedAt: null,
  hasUnread: true,
  counterparty: {
    boardUserId: 'candidate-1',
    displayName: 'Hue Le',
    avatarUrl: null,
    companyName: null,
    handle: 'hue',
    companySlug: null,
  },
};

const blockedUser: BlockedUser = {
  id: 'block-1',
  object: 'blocked_user',
  boardUserId: 'candidate-1',
  displayName: 'Hue Le',
  avatarUrl: null,
  createdAt: '2026-07-14T00:00:00.000Z',
};

const detail: ConversationDetail = {
  ...conversation,
  viewerRole: 'employer',
  viewerLastReadMessageId: null,
};

afterEach(cleanup);

describe('messaging runtime failures', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('announces a failed inbox pagination request and leaves Load more available', async () => {
    vi.mocked(getInbox).mockRejectedValue(new Error('Network failed'));

    render(
      <InboxController
        initial={{
          object: 'list',
          url: '/v1/me/conversations',
          data: [conversation],
          hasMore: true,
          nextCursor: 'next-page',
        }}
        archived={false}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'alert');
    expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled();
  });

  it('announces a failed unblock without removing the blocked user', async () => {
    vi.mocked(unblockUser).mockRejectedValue(new Error('Network failed'));

    render(<BlockedController initial={[blockedUser]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unblock' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'alert');
    expect(screen.getByText('Hue Le')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unblock' })).toBeEnabled();
  });

  it('announces when a conversation could not be marked as read', async () => {
    vi.mocked(markRead).mockRejectedValue(new Error('Mark read failed'));

    render(
      <ThreadController
        initialConversation={detail}
        initialMessages={{
          object: 'list',
          url: `/v1/me/conversations/${conversation.id}/messages`,
          data: [],
          hasMore: false,
          nextCursor: null,
        }}
        initialBlockStatus={{ object: 'block_status', blocked: false }}
        onExit={vi.fn()}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });

  it('keeps an open inbox and thread comfortably inside the API call budget', () => {
    vi.mocked(markRead).mockResolvedValue({} as never);

    render(
      <InboxController
        initial={{
          object: 'list',
          url: '/v1/me/conversations',
          data: [conversation],
          hasMore: false,
          nextCursor: null,
        }}
        archived={false}
        onSelect={vi.fn()}
      />,
    );
    render(
      <ThreadController
        initialConversation={detail}
        initialMessages={{
          object: 'list',
          url: `/v1/me/conversations/${conversation.id}/messages`,
          data: [],
          hasMore: false,
          nextCursor: null,
        }}
        initialBlockStatus={{ object: 'block_status', blocked: false }}
        onExit={vi.fn()}
      />,
    );

    const [inboxPoll, threadPoll] = vi
      .mocked(useVisiblePoll)
      .mock.calls.map((call) => call[1] ?? 4_000);
    const unreadCallsPerMinute = 8;
    const inboxCallsPerMinute = (60_000 / inboxPoll) * 2;
    const threadCallsPerMinute = (60_000 / threadPoll) * 4;

    // Leave at least 60% of the per-board-user 100/minute allowance for
    // initial loads, read receipts, replies, and ordinary navigation.
    expect(
      unreadCallsPerMinute + inboxCallsPerMinute + threadCallsPerMinute,
    ).toBeLessThanOrEqual(40);
  });
});
