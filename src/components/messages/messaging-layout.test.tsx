// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
    const list = screen.getByRole('navigation', { name: 'Conversations' });
    const conversation = screen.getByRole('region', {
      name: 'Conversation',
    });
    expect(layout).toContainElement(list);
    expect(layout).toContainElement(conversation);
    expect(
      list.compareDocumentPosition(conversation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
