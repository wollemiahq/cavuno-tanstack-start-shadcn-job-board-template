// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessagingDock } from './messaging-dock';

describe('MessagingDock', () => {
  it('keeps the inbox at bottom-right and opens the conversation in a separate box to its left', () => {
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
    expect(launcher.closest('div')).not.toHaveClass('rhea-theme');
    expect(launcher.closest('div')).toHaveClass('fixed', 'bottom-0', 'right-6');
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
    const dockRow = inbox.parentElement;

    expect(inbox).toHaveAttribute('data-slot', 'card');
    expect(conversation).toHaveAttribute('data-slot', 'card');
    expect(dockRow).toHaveClass(
      'fixed',
      'bottom-0',
      'right-6',
      'hidden',
      'md:flex',
    );
    expect(conversation).toHaveClass('w-[28rem]');
    expect(inbox).toHaveClass('w-80');
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
