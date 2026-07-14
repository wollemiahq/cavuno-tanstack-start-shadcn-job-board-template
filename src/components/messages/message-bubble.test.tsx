// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageBubble } from './message-bubble';

import type { Message } from '@cavuno/board';

const message: Message = {
  id: 'message-1',
  object: 'message',
  conversationId: 'conversation-1',
  authorBoardUserId: 'viewer-1',
  recipientBoardUserId: 'other-1',
  body: 'A very long message that must wrap instead of widening the conversation panel.',
  author: {
    displayName: 'Abi T. Tunggal',
    avatarUrl: null,
    companyName: null,
  },
  sentAt: new Date().toISOString(),
  editedAt: null,
  deletedAt: null,
  readAt: new Date().toISOString(),
};

describe('MessageBubble', () => {
  it('uses the official shadcn message and bubble composition with visible identity', () => {
    render(
      <MessageBubble
        message={message}
        own
        showSeen
        onChanged={vi.fn()}
        onReported={vi.fn()}
        onEdit={vi.fn()}
        onUnsend={vi.fn()}
        onReport={vi.fn()}
      />,
    );

    const body = screen.getByText(message.body);
    expect(body.closest('[data-slot=bubble]')).toHaveAttribute(
      'data-align',
      'end',
    );
    expect(body.closest('[data-slot=message]')).toHaveAttribute(
      'data-align',
      'end',
    );
    expect(body).toHaveClass('whitespace-pre-wrap', '[overflow-wrap:anywhere]');
    expect(screen.getByText('Abi T. Tunggal')).toHaveAttribute(
      'data-slot',
      'message-header',
    );
    expect(screen.getByText(/Seen/)).toHaveAttribute(
      'data-slot',
      'message-footer',
    );
  });

  it('hydrates message timestamps when the server and browser use different timezones', async () => {
    const originalTimezone = process.env.TZ;
    const onChanged = vi.fn();
    const onReported = vi.fn();
    const onEdit = vi.fn();
    const onUnsend = vi.fn();
    const onReport = vi.fn();
    const props = {
      message: {
        ...message,
        sentAt: '2026-07-14T04:00:00.000Z',
        readAt: '2026-07-14T04:01:00.000Z',
      },
      own: true,
      showSeen: true,
      onChanged,
      onReported,
      onEdit,
      onUnsend,
      onReport,
    };

    process.env.TZ = 'UTC';
    const serverHtml = renderToString(<MessageBubble {...props} />);
    process.env.TZ = 'Australia/Sydney';

    const container = document.createElement('div');
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const root = hydrateRoot(container, <MessageBubble {...props} />);

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
