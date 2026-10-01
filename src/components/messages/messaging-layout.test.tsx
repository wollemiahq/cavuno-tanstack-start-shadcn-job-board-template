// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { m } from '../../paraglide/messages';
import { MessagingLayout } from './messaging-layout';

describe('MessagingLayout', () => {
  it('labels the conversation list and selected conversation in reading order', () => {
    render(
      <MessagingLayout
        aria-label="Messaging"
        list={<p>Conversation list</p>}
        conversation={<p>Selected conversation</p>}
        mobilePane="conversation"
      />,
    );

    const layout = screen.getByRole('region', { name: 'Messaging' });
    const list = screen.getByRole('navigation', {
      name: m.messagesPage_conversationsAriaLabel(),
    });
    const conversation = screen.getByRole('region', {
      name: m.messagesPage_conversationTitle(),
    });
    expect(layout).toContainElement(list);
    expect(layout).toContainElement(conversation);
    expect(
      list.compareDocumentPosition(conversation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
