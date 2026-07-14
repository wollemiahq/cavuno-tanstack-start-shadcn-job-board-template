import { Link } from '@tanstack/react-router';

import { m } from '../../paraglide/messages';
import { Avatar } from './avatar';
import { HydrationSafeDate } from './hydration-safe-date';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Conversation } from '@cavuno/board';

function counterpartyLabel(conversation: Conversation) {
  const { displayName, companyName } = conversation.counterparty;
  return companyName ? `${displayName} · ${companyName}` : displayName;
}

function ConversationRow({
  conversation,
  selected,
  view,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  view: 'inbox' | 'archived';
  onSelect?: (conversationId: string) => void;
}) {
  const content = (
    <>
      <Avatar
        url={conversation.counterparty.avatarUrl}
        name={conversation.counterparty.displayName}
        className="size-10"
      />
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'truncate',
              conversation.hasUnread && 'font-semibold',
            )}
          >
            {counterpartyLabel(conversation)}
          </p>
          <time
            dateTime={conversation.lastMessageAt}
            className="text-muted-foreground shrink-0 text-xs"
          >
            <HydrationSafeDate
              iso={conversation.lastMessageAt}
              presentation="relative"
            />
          </time>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground truncate text-sm">
            {conversation.lastMessageSnippet ||
              m.messageBubble_messageDeletedText()}
          </p>
          {conversation.hasUnread ? (
            <span
              className="bg-primary ml-auto size-2 shrink-0 rounded-full"
              aria-label={m.inboxList_unreadAriaLabel()}
              data-test="unread-dot"
            />
          ) : null}
        </div>
      </div>
    </>
  );
  const className = cn(
    'hover:bg-muted focus-visible:ring-ring/30 flex w-full items-center gap-3 px-3 py-3 text-left transition-colors outline-none focus-visible:ring-3',
    selected && 'bg-muted',
  );

  return onSelect ? (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      className={className}
      data-conversation-id={conversation.id}
      onClick={() => onSelect(conversation.id)}
    >
      {content}
    </button>
  ) : (
    <Link
      to="/messages/$conversationId"
      params={{ conversationId: conversation.id }}
      search={view === 'archived' ? { view: 'archived' } : {}}
      aria-current={selected ? 'page' : undefined}
      className={className}
      data-conversation-id={conversation.id}
    >
      {content}
    </Link>
  );
}

export function InboxList({
  conversations,
  archived,
  selectedConversationId,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelect,
  emptyText,
}: {
  conversations: Conversation[];
  archived: boolean;
  selectedConversationId?: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelect?: (conversationId: string) => void;
  emptyText?: string;
}) {
  if (conversations.length === 0) {
    return (
      <p
        className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center text-sm"
        data-test="inbox-empty"
      >
        {emptyText ??
          (archived
            ? m.inboxList_noArchivedText()
            : m.inboxList_noConversationsText())}
      </p>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" data-test="inbox-list">
      <ul className="divide-border divide-y">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <ConversationRow
              conversation={conversation}
              selected={conversation.id === selectedConversationId}
              view={archived ? 'archived' : 'inbox'}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>

      {hasMore ? (
        <div className="p-3 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore
              ? m.inboxList_loadingLabel()
              : m.inboxList_loadMoreLabel()}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
