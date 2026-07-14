import type { Conversation, Message } from '@cavuno/board';

export type MessagesView = 'inbox' | 'archived' | 'blocked';

export function mergeConversations(
  current: Conversation[],
  incoming: Conversation[],
) {
  const byId = new Map(
    current.map((conversation) => [conversation.id, conversation]),
  );
  for (const conversation of incoming) byId.set(conversation.id, conversation);
  return [...byId.values()].sort((first, second) =>
    second.lastMessageAt.localeCompare(first.lastMessageAt),
  );
}

export function mergeMessages(current: Message[], incoming: Message[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((first, second) =>
    first.sentAt.localeCompare(second.sentAt),
  );
}
