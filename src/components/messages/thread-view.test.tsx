// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThreadView } from './thread-view';

import type { ConversationDetail, Message } from '@cavuno/board';

const conversation: ConversationDetail = {
  id: 'conversation-1',
  object: 'conversation',
  lastMessageAt: '2026-07-14T05:00:00.000Z',
  lastMessageSnippet: 'Latest reply',
  lastMessageAuthorBoardUserId: 'candidate-1',
  archivedAt: null,
  hasUnread: true,
  viewerRole: 'employer',
  viewerLastReadMessageId: 'message-1',
  counterparty: {
    boardUserId: 'candidate-1',
    displayName: 'Hue Le',
    avatarUrl: null,
    companyName: null,
    handle: 'hue',
    companySlug: null,
  },
};

const messages: Message[] = [
  {
    id: 'message-1',
    object: 'message',
    conversationId: conversation.id,
    authorBoardUserId: 'viewer-1',
    recipientBoardUserId: 'candidate-1',
    body: 'Hello',
    author: { displayName: 'Abi', avatarUrl: null, companyName: 'Cavuno' },
    sentAt: '2026-07-14T04:00:00.000Z',
    editedAt: null,
    deletedAt: null,
    readAt: '2026-07-14T04:01:00.000Z',
  },
  {
    id: 'message-2',
    object: 'message',
    conversationId: conversation.id,
    authorBoardUserId: 'candidate-1',
    recipientBoardUserId: 'viewer-1',
    body: 'Latest reply',
    author: { displayName: 'Hue Le', avatarUrl: null, companyName: null },
    sentAt: '2026-07-14T05:00:00.000Z',
    editedAt: null,
    deletedAt: null,
    readAt: null,
  },
];

afterEach(cleanup);

describe('ThreadView', () => {
  it('renders a pure shadcn thread with role context and an unread marker', () => {
    render(
      <ThreadView
        conversation={conversation}
        messages={messages}
        blocked={false}
        onBack={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onEditMessage={vi.fn()}
        onUnsendMessage={vi.fn()}
        onReportMessage={vi.fn()}
        onSend={vi.fn()}
        onRefresh={vi.fn()}
        onReported={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Hue Le' })).toBeInTheDocument();
    expect(screen.getByText('Candidate')).toBeInTheDocument();
    expect(screen.getByText('Unread messages')).toHaveAttribute(
      'data-slot',
      'marker-content',
    );
    expect(screen.getByTestId('message-stream')).toHaveAttribute(
      'data-slot',
      'message-scroller',
    );
    expect(
      screen
        .getByText('Latest reply')
        .closest('[data-slot=message-scroller-item]'),
    ).toHaveAttribute('data-message-id', 'message-2');
  });

  it('identifies an employer counterparty when the signed-in viewer is a candidate', () => {
    render(
      <ThreadView
        conversation={{
          ...conversation,
          viewerRole: 'candidate',
          counterparty: {
            ...conversation.counterparty,
            companyName: 'Cavuno',
          },
        }}
        messages={messages}
        blocked={false}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onEditMessage={vi.fn()}
        onUnsendMessage={vi.fn()}
        onReportMessage={vi.fn()}
        onSend={vi.fn()}
        onRefresh={vi.fn()}
        onReported={vi.fn()}
      />,
    );

    expect(screen.getByText('Employer')).toBeInTheDocument();
  });

  it('keeps company navigation inside the TanStack application', async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <ThreadView
          conversation={{
            ...conversation,
            counterparty: {
              ...conversation.counterparty,
              companyName: 'Cavuno',
              companySlug: 'cavuno',
            },
          }}
          messages={messages}
          blocked={false}
          companyHref="/companies/cavuno"
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onBlock={vi.fn()}
          onUnblock={vi.fn()}
          onEditMessage={vi.fn()}
          onUnsendMessage={vi.fn()}
          onReportMessage={vi.fn()}
          onSend={vi.fn()}
          onRefresh={vi.fn()}
          onReported={vi.fn()}
        />
      ),
    });
    const companyRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/companies/$companySlug',
      component: () => <p>Company page</p>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, companyRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    render(<RouterProvider router={router} />);
    fireEvent.click(
      await screen.findByRole('link', { name: 'Hue Le · Cavuno' }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/companies/cavuno'),
    );
  });

  it('announces a conversation action failure instead of rejecting silently', async () => {
    const onArchive = vi.fn().mockRejectedValue(new Error('Network failed'));
    render(
      <ThreadView
        conversation={conversation}
        messages={messages}
        blocked={false}
        onArchive={onArchive}
        onUnarchive={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onEditMessage={vi.fn()}
        onUnsendMessage={vi.fn()}
        onReportMessage={vi.fn()}
        onSend={vi.fn()}
        onRefresh={vi.fn()}
        onReported={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Conversation actions' }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Network failed',
    );
    expect(onArchive).toHaveBeenCalledOnce();
  });

  it('hydrates day markers when the server and browser use different timezones', async () => {
    const originalTimezone = process.env.TZ;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T16:00:00.000Z'));
    const timezoneMessages = messages.map((message, index) => ({
      ...message,
      sentAt:
        index === 0 ? '2026-07-14T13:00:00.000Z' : '2026-07-14T15:00:00.000Z',
    }));
    const props = {
      conversation,
      messages: timezoneMessages,
      blocked: false,
      onArchive: vi.fn(),
      onUnarchive: vi.fn(),
      onBlock: vi.fn(),
      onUnblock: vi.fn(),
      onEditMessage: vi.fn(),
      onUnsendMessage: vi.fn(),
      onReportMessage: vi.fn(),
      onSend: vi.fn(),
      onRefresh: vi.fn(),
      onReported: vi.fn(),
    };

    process.env.TZ = 'UTC';
    const serverHtml = renderToString(<ThreadView {...props} />);
    process.env.TZ = 'Australia/Sydney';

    const container = document.createElement('div');
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const root = hydrateRoot(container, <ThreadView {...props} />);

    await act(async () => undefined);

    expect(consoleError.mock.calls.flat().map(String).join('\n')).not.toContain(
      'Hydration failed',
    );

    await act(async () => root.unmount());
    consoleError.mockRestore();
    container.remove();
    process.env.TZ = originalTimezone;
    vi.useRealTimers();
  });
});
