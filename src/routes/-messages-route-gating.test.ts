// @vitest-environment jsdom

/**
 * The messaging routes (`/messages`, `/messages/$conversationId`) gate on the
 * board's `features.messaging` flag: when the surface is off the loader must
 * read as not-found (the feature does not exist), never fetch the inbox.
 */
import { isNotFound as isRouteNotFound } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const queryMocks = vi.hoisted(() => ({
  getBoardContext: vi.fn(),
  getSeoBase: vi.fn(),
}));
const messagingMocks = vi.hoisted(() => ({
  getInbox: vi.fn(),
  getBlocked: vi.fn(),
  getThread: vi.fn(),
}));

vi.mock('@/server/queries', () => ({
  getBoardContext: queryMocks.getBoardContext,
  getSeoBase: queryMocks.getSeoBase,
}));
vi.mock('@/server/messaging', () => ({
  getInbox: messagingMocks.getInbox,
  getBlocked: messagingMocks.getBlocked,
  getThread: messagingMocks.getThread,
}));

import { Route as ConversationRoute } from './messages.$conversationId';
import { Route as MessagesRoute } from './messages';

const inbox = { conversations: { object: 'list', data: [] } };

beforeEach(() => {
  queryMocks.getSeoBase.mockResolvedValue({ boardName: 'Acme Board' });
  queryMocks.getBoardContext.mockResolvedValue({
    features: { nativeApplications: true, messaging: true },
  });
  messagingMocks.getInbox.mockResolvedValue(inbox);
  messagingMocks.getBlocked.mockResolvedValue({ data: [] });
  messagingMocks.getThread.mockResolvedValue({
    conversation: { id: 'c1', counterparty: { companySlug: null } },
    messages: { object: 'list', data: [] },
    blockStatus: { object: 'block_status', blocked: false },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('messages inbox route — messaging feature gate', () => {
  it('loads the inbox when messaging is on', async () => {
    const loader = MessagesRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The messages route needs a loader');

    const data = await loader({ deps: { view: 'inbox' } } as never);

    expect(data).toMatchObject({ view: 'inbox' });
    expect(messagingMocks.getInbox).toHaveBeenCalledOnce();
  });

  it('is not-found when messaging is off, and never reads the inbox', async () => {
    queryMocks.getBoardContext.mockResolvedValue({
      features: { nativeApplications: true, messaging: false },
    });
    const loader = MessagesRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The messages route needs a loader');

    let outcome: unknown;
    try {
      await loader({ deps: { view: 'inbox' } } as never);
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
    expect(messagingMocks.getInbox).not.toHaveBeenCalled();
  });
});

describe('messages thread route — messaging feature gate', () => {
  it('loads the thread when messaging is on', async () => {
    const loader = ConversationRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The thread route needs a loader');

    const data = await loader({
      params: { conversationId: 'c1' },
      deps: { view: 'inbox' },
    } as never);

    expect(data).toMatchObject({ view: 'inbox' });
    expect(messagingMocks.getThread).toHaveBeenCalledOnce();
  });

  it('is not-found when messaging is off, and never reads the thread', async () => {
    queryMocks.getBoardContext.mockResolvedValue({
      features: { nativeApplications: true, messaging: false },
    });
    const loader = ConversationRoute.options.loader;
    if (typeof loader !== 'function')
      throw new Error('The thread route needs a loader');

    let outcome: unknown;
    try {
      await loader({
        params: { conversationId: 'c1' },
        deps: { view: 'inbox' },
      } as never);
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
    expect(messagingMocks.getThread).not.toHaveBeenCalled();
  });
});
