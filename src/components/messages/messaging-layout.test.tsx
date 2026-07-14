// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessagingLayout } from './messaging-layout';

describe('MessagingLayout', () => {
  it('keeps the dedicated messaging page in one bordered two-column box', () => {
    render(
      <MessagingLayout
        aria-label="Messaging"
        list={<p>Conversation list</p>}
        conversation={<p>Selected conversation</p>}
        mobilePane="conversation"
      />,
    );

    const layout = screen.getByRole('region', { name: 'Messaging' });
    expect(layout).toHaveClass('rhea-theme');
    expect(layout).toHaveClass('overflow-hidden', 'rounded-xl', 'border');
    expect(layout).toHaveClass('md:grid-cols-[22rem_minmax(0,1fr)]');

    const list = screen.getByRole('navigation', { name: 'Conversations' });
    const conversation = screen.getByRole('region', {
      name: 'Selected conversation',
    });
    expect(list).toHaveClass('hidden', 'md:flex');
    expect(conversation).toHaveClass('flex');
    expect(
      list.compareDocumentPosition(conversation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
