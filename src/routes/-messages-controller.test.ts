import { describe, expect, it } from 'vitest';

import { mergeConversations, mergeMessages } from './-messages-controller';

import type { Conversation, Message } from '@cavuno/board';

function conversation(
  id: string,
  lastMessageAt: string,
  snippet: string,
): Conversation {
  return {
    id,
    object: 'conversation',
    lastMessageAt,
    lastMessageSnippet: snippet,
    lastMessageAuthorBoardUserId: 'user-1',
    archivedAt: null,
    hasUnread: false,
    counterparty: {
      boardUserId: 'user-1',
      displayName: 'Hue Le',
      avatarUrl: null,
      companyName: null,
      handle: null,
      companySlug: null,
    },
  };
}

function message(id: string, sentAt: string, body: string): Message {
  return {
    id,
    object: 'message',
    conversationId: 'conversation-1',
    authorBoardUserId: 'user-1',
    recipientBoardUserId: 'user-2',
    body,
    author: { displayName: 'Hue Le', avatarUrl: null, companyName: null },
    sentAt,
    editedAt: null,
    deletedAt: null,
    readAt: null,
  };
}

describe('messaging controller merges', () => {
  it('keeps loaded inbox pages while replacing duplicates with fresher polled rows', () => {
    expect(
      mergeConversations(
        [
          conversation('a', '2026-07-14T01:00:00.000Z', 'old'),
          conversation('b', '2026-07-14T02:00:00.000Z', 'loaded page'),
        ],
        [conversation('a', '2026-07-14T03:00:00.000Z', 'fresh')],
      ).map(({ id, lastMessageSnippet }) => [id, lastMessageSnippet]),
    ).toEqual([
      ['a', 'fresh'],
      ['b', 'loaded page'],
    ]);
  });

  it('keeps messages chronological while replacing a duplicate with its latest copy', () => {
    expect(
      mergeMessages(
        [message('a', '2026-07-14T01:00:00.000Z', 'old')],
        [
          message('b', '2026-07-14T02:00:00.000Z', 'second'),
          message('a', '2026-07-14T01:00:00.000Z', 'edited'),
        ],
      ).map(({ id, body }) => [id, body]),
    ).toEqual([
      ['a', 'edited'],
      ['b', 'second'],
    ]);
  });
});
