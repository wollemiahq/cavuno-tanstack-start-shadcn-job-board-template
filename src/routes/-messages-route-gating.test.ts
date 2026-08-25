// @vitest-environment jsdom

/**
 * The messaging routes (`/messages`, `/messages/$conversationId`) gate on the
 * board's `features.messaging` flag: when the surface is off the loader must
 * read as not-found (the feature does not exist), never fetch the inbox.
 */
import {
  isNotFound as isRouteNotFound,
  isRedirect,
} from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMessagesLoader,
  type MessagesLoaderDependencies,
} from './-messages';
import {
  createConversationLoader,
  type ConversationLoaderDependencies,
} from './-messages.$conversationId';
import { hasSelectedConversationRoute } from './messages';

const getBoardContext = vi.fn<MessagesLoaderDependencies['getBoardContext']>();
const getSeoBase = vi.fn<MessagesLoaderDependencies['getSeoBase']>();
const getInbox = vi.fn<MessagesLoaderDependencies['getInbox']>();
const getBlocked = vi.fn<MessagesLoaderDependencies['getBlocked']>();
const getThread = vi.fn<ConversationLoaderDependencies['getThread']>();

const messagesDependencies: MessagesLoaderDependencies = {
  getBoardContext,
  getSeoBase,
  getInbox,
  getBlocked,
};
const conversationDependencies: ConversationLoaderDependencies = {
  getBoardContext,
  getSeoBase,
  getInbox,
  getThread,
};

function messagesLoaderContext(view: 'inbox' | 'archived') {
  const pathname = '/messages';
  return {
    abortController: new AbortController(),
    preload: false,
    params: {},
    deps: { view },
    context: { origin: 'https://board.example' },
    location: {
      href: view === 'inbox' ? pathname : `${pathname}?view=${view}`,
      pathname,
      search: { view },
      searchStr: view === 'inbox' ? '' : `?view=${view}`,
      state: { __TSR_index: 0 },
      hash: '',
      publicHref: pathname,
      external: false,
    },
    navigate: vi.fn(),
    parentMatchPromise: new Promise<never>(() => undefined),
    cause: 'enter' as const,
  };
}

function conversationLoaderContext(view: 'inbox' | 'archived') {
  const pathname = '/messages/c1';
  return {
    ...messagesLoaderContext(view),
    params: { conversationId: 'c1' },
    location: {
      ...messagesLoaderContext(view).location,
      href: view === 'inbox' ? pathname : `${pathname}?view=${view}`,
      pathname,
      publicHref: pathname,
    },
  };
}

const inbox = {
  conversations: {
    object: 'list' as const,
    url: '/v1/me/conversations',
    data: [],
    hasMore: false,
    nextCursor: null,
  },
};

beforeEach(() => {
  getSeoBase.mockResolvedValue({ boardName: 'Acme Board' });
  getBoardContext.mockResolvedValue({ features: { messaging: true } });
  getInbox.mockResolvedValue(inbox);
  getBlocked.mockResolvedValue({
    object: 'list',
    url: '/v1/me/blocks',
    data: [],
    hasMore: false,
    nextCursor: null,
  });
  getThread.mockResolvedValue({
    conversation: {
      id: 'c1',
      object: 'conversation',
      lastMessageAt: '2026-07-14T05:00:00.000Z',
      lastMessageSnippet: 'Latest reply',
      lastMessageAuthorBoardUserId: 'candidate-1',
      archivedAt: null,
      hasUnread: false,
      counterparty: {
        boardUserId: 'candidate-1',
        displayName: 'Candidate',
        avatarUrl: null,
        companyName: null,
        handle: 'candidate',
        companySlug: null,
      },
      viewerRole: 'employer',
      viewerLastReadMessageId: null,
    },
    messages: {
      object: 'list',
      url: '/v1/me/conversations/c1/messages',
      data: [],
      hasMore: false,
      nextCursor: null,
    },
    blockStatus: { object: 'block_status', blocked: false },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('messages route nesting', () => {
  it('hands a selected conversation URL to the nested thread route', () => {
    expect(
      hasSelectedConversationRoute([
        { routeId: '__root__' },
        { routeId: '/messages' },
        { routeId: '/messages/$conversationId' },
      ]),
    ).toBe(true);
    expect(
      hasSelectedConversationRoute([
        { routeId: '__root__' },
        { routeId: '/messages' },
      ]),
    ).toBe(false);
  });
});

describe('messages inbox route — messaging feature gate', () => {
  it('loads the inbox when messaging is on', async () => {
    const data = await createMessagesLoader(messagesDependencies)(
      messagesLoaderContext('inbox'),
    );

    expect(data).toMatchObject({ view: 'inbox' });
    expect(getInbox).toHaveBeenCalledOnce();
  });

  it('is not-found when messaging is off, and never reads the inbox', async () => {
    getBoardContext.mockResolvedValue({
      features: { messaging: false },
    });
    let outcome: unknown;
    try {
      await createMessagesLoader(messagesDependencies)(
        messagesLoaderContext('inbox'),
      );
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
    expect(getInbox).not.toHaveBeenCalled();
  });
});

describe('messages thread route — messaging feature gate', () => {
  it('loads the thread when messaging is on', async () => {
    const data = await createConversationLoader(conversationDependencies)(
      conversationLoaderContext('inbox'),
    );

    expect(data).toMatchObject({ status: 'ready', view: 'inbox' });
    expect(getThread).toHaveBeenCalledOnce();
  });

  it('is not-found when messaging is off, and never reads the thread', async () => {
    getBoardContext.mockResolvedValue({
      features: { messaging: false },
    });
    let outcome: unknown;
    try {
      await createConversationLoader(conversationDependencies)(
        conversationLoaderContext('inbox'),
      );
    } catch (error) {
      outcome = error;
    }

    expect(isRouteNotFound(outcome)).toBe(true);
    expect(getThread).not.toHaveBeenCalled();
  });

  it('returns unauthenticated thread visitors to the exact thread after sign-in', async () => {
    getThread.mockRejectedValue(new Error('UNAUTHENTICATED'));
    let outcome: unknown;
    try {
      await createConversationLoader(conversationDependencies)(
        conversationLoaderContext('archived'),
      );
    } catch (error) {
      outcome = error;
    }

    expect(isRedirect(outcome)).toBe(true);
    if (!isRedirect(outcome)) return;
    expect(outcome.options).toMatchObject({
      to: '/auth/sign-in',
      search: { returnTo: '/messages/c1?view=archived' },
    });
  });

  it('keeps the failed thread selected for a recoverable non-authentication failure', async () => {
    getThread.mockRejectedValue(new Error('upstream timeout'));
    const outcome = await createConversationLoader(conversationDependencies)(
      conversationLoaderContext('archived'),
    );

    expect(outcome).toMatchObject({
      status: 'error',
      conversationId: 'c1',
      view: 'archived',
      inbox,
    });
  });
});
