// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessagingDock } from './messaging-dock';

describe('MessagingDock', () => {
  it('opens the inbox and manages a separate conversation', () => {
    const onOpenChange = vi.fn();
    const onCloseConversation = vi.fn();

    const { rerender } = render(
      <MessagingDock
        open={false}
        unreadCount={3}
        messagesLabel="Messages"
        openMessagesLabel="Open messages, 3 unread"
        minimizeMessagesLabel="Minimize messages"
        closeConversationLabel="Close conversation"
        conversationLabel="Conversation with Hue Le"
        onOpenChange={onOpenChange}
        onCloseConversation={onCloseConversation}
        inbox={<p>Inbox content</p>}
      />,
    );

    const launcher = screen.getByRole('button', {
      name: 'Open messages, 3 unread',
    });
    fireEvent.click(launcher);
    expect(onOpenChange).toHaveBeenCalledWith(true);

    rerender(
      <MessagingDock
        open
        unreadCount={3}
        messagesLabel="Messages"
        openMessagesLabel="Open messages, 3 unread"
        minimizeMessagesLabel="Minimize messages"
        closeConversationLabel="Close conversation"
        conversationLabel="Conversation with Hue Le"
        onOpenChange={onOpenChange}
        onCloseConversation={onCloseConversation}
        inbox={<p>Inbox content</p>}
        conversation={<p>Thread content</p>}
      />,
    );

    const inbox = screen.getByRole('complementary', { name: 'Messages' });
    const conversation = screen.getByRole('complementary', {
      name: 'Conversation with Hue Le',
    });
    expect(
      conversation.compareDocumentPosition(inbox) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    fireEvent.click(screen.getByRole('button', { name: 'Close conversation' }));
    expect(onCloseConversation).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Minimize messages' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
