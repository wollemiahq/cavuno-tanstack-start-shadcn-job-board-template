// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MessagesDockController,
  type MessagesDockDependencies,
} from './-messages-dock-controller';

import type { Conversation, ConversationDetail, Message } from '@cavuno/board';

const archiveConversation =
  vi.fn<MessagesDockDependencies['archiveConversation']>();
const blockUser = vi.fn<MessagesDockDependencies['blockUser']>();
const editMessage = vi.fn<MessagesDockDependencies['editMessage']>();
const getInbox = vi.fn<MessagesDockDependencies['getInbox']>();
const getThread = vi.fn<MessagesDockDependencies['getThread']>();
const markRead = vi.fn<MessagesDockDependencies['markRead']>();
const reportMessage = vi.fn<MessagesDockDependencies['reportMessage']>();
const sendReply = vi.fn<MessagesDockDependencies['sendReply']>();
const unarchiveConversation =
  vi.fn<MessagesDockDependencies['unarchiveConversation']>();
const unblockUser = vi.fn<MessagesDockDependencies['unblockUser']>();
const unsendMessage = vi.fn<MessagesDockDependencies['unsendMessage']>();
const useVisiblePoll = vi.fn<MessagesDockDependencies['useVisiblePoll']>();
const dependencies: MessagesDockDependencies = {
  archiveConversation,
  blockUser,
  editMessage,
  getInbox,
  getThread,
  markRead,
  reportMessage,
  sendReply,
  unarchiveConversation,
  unblockUser,
  unsendMessage,
  useVisiblePoll,
};

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

const detail: ConversationDetail = {
  ...conversation,
  viewerRole: 'employer',
  viewerLastReadMessageId: null,
};

const message: Message = {
  id: 'message-1',
  object: 'message',
  conversationId: conversation.id,
  authorBoardUserId: 'candidate-1',
  recipientBoardUserId: 'viewer-1',
  body: 'Latest reply',
  author: { displayName: 'Hue Le', avatarUrl: null, companyName: null },
  sentAt: conversation.lastMessageAt,
  editedAt: null,
  deletedAt: null,
  readAt: null,
};

describe('MessagesDockController', () => {
  beforeEach(() => {
    cleanup();
    vi.resetAllMocks();
    markRead.mockResolvedValue({
      object: 'read_receipt',
      markedAt: '2026-07-14T05:00:00.000Z',
    });
  });

  it('keeps the inbox idle until the user opens the dock', async () => {
    getInbox.mockResolvedValue({
      conversations: {
        object: 'list',
        url: '/v1/me/conversations',
        data: [],
        hasMore: false,
        nextCursor: null,
      },
    });

    render(
      <MessagesDockController unreadCount={0} dependencies={dependencies} />,
    );

    expect(getInbox).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Open messaging, 0 unread' }),
    );
    await waitFor(() => expect(getInbox).toHaveBeenCalledOnce());
  });

  it('opens the inbox at the right and a selected conversation in the adjacent window', async () => {
    getInbox.mockResolvedValue({
      conversations: {
        object: 'list',
        url: '/v1/me/conversations',
        data: [conversation],
        hasMore: false,
        nextCursor: null,
      },
    });
    getThread.mockResolvedValue({
      conversation: detail,
      messages: {
        object: 'list',
        url: `/v1/me/conversations/${conversation.id}/messages`,
        data: [message],
        hasMore: false,
        nextCursor: null,
      },
      blockStatus: { object: 'block_status', blocked: false },
    });

    render(
      <MessagesDockController unreadCount={2} dependencies={dependencies} />,
    );

    const launcher = await screen.findByRole('button', {
      name: 'Open messaging, 2 unread',
    });
    fireEvent.click(launcher);
    fireEvent.click(await screen.findByRole('button', { name: /Hue Le/ }));

    await waitFor(() => expect(getThread).toHaveBeenCalled());
    expect(
      screen.getByRole('complementary', { name: 'Messaging' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Conversation with Hue Le' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Hue Le' }),
    ).toBeInTheDocument();
  });

  it('replaces a failed initial inbox load with an honest retry state', async () => {
    getInbox.mockRejectedValue(new Error('Network failed'));

    render(
      <MessagesDockController unreadCount={0} dependencies={dependencies} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Open messaging, 0 unread' }),
    );
    expect(
      await screen.findByText("We couldn't load messages"),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'empty');

    getInbox.mockResolvedValue({
      conversations: {
        object: 'list',
        url: '/v1/me/conversations',
        data: [conversation],
        hasMore: false,
        nextCursor: null,
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('button', { name: /Hue Le/ }),
    ).toBeInTheDocument();
  });

  it('replaces a failed conversation load with an honest retry state', async () => {
    getInbox.mockResolvedValue({
      conversations: {
        object: 'list',
        url: '/v1/me/conversations',
        data: [conversation],
        hasMore: false,
        nextCursor: null,
      },
    });
    getThread.mockRejectedValue(new Error('Network failed'));

    render(
      <MessagesDockController unreadCount={1} dependencies={dependencies} />,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Open messaging, 1 unread',
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /Hue Le/ }));
    expect(
      await screen.findByText("We couldn't load this conversation"),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'empty');

    getThread.mockResolvedValue({
      conversation: detail,
      messages: {
        object: 'list',
        url: `/v1/me/conversations/${conversation.id}/messages`,
        data: [message],
        hasMore: false,
        nextCursor: null,
      },
      blockStatus: { object: 'block_status', blocked: false },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('heading', { name: 'Hue Le' }),
    ).toBeInTheDocument();
  });
});
