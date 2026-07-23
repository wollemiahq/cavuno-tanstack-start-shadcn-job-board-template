import { Link } from '@tanstack/react-router';

import { m } from '../../paraglide/messages';
import { Avatar } from './avatar';
import { HydrationSafeDate } from './hydration-safe-date';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
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
      <ItemMedia>
        <Avatar
          url={conversation.counterparty.avatarUrl}
          name={conversation.counterparty.displayName}
          className="size-10"
        />
      </ItemMedia>
      <ItemContent className="min-w-0 text-start">
        <ItemTitle className="w-full justify-between gap-2">
          <span
            className={cn(
              'truncate',
              conversation.hasUnread && 'font-semibold',
            )}
          >
            {counterpartyLabel(conversation)}
          </span>
          <time
            dateTime={conversation.lastMessageAt}
            className="text-muted-foreground shrink-0 text-xs"
          >
            <HydrationSafeDate
              iso={conversation.lastMessageAt}
              presentation="relative"
            />
          </time>
        </ItemTitle>
        <ItemDescription className="flex w-full items-center gap-2">
          <span className="truncate">
            {conversation.lastMessageSnippet ||
              m.messageBubble_messageDeletedText()}
          </span>
          {conversation.hasUnread ? (
            <span
              className="bg-primary ms-auto size-2 shrink-0 rounded-full"
              aria-label={m.inboxList_unreadAriaLabel()}
              data-test="unread-dot"
            />
          ) : null}
        </ItemDescription>
      </ItemContent>
    </>
  );
  const className = cn(
    'hover:bg-muted flex-nowrap rounded-none border-0 px-3 py-3 text-start',
    selected && 'bg-muted',
  );

  return onSelect ? (
    <Item
      className={className}
      render={
        <button
          type="button"
          aria-current={selected ? 'true' : undefined}
          data-conversation-id={conversation.id}
          onClick={() => onSelect(conversation.id)}
        />
      }
    >
      {content}
    </Item>
  ) : (
    <Item
      className={className}
      render={
        <Link
          to="/messages/$conversationId"
          params={{ conversationId: conversation.id }}
          search={view === 'archived' ? { view: 'archived' } : {}}
          aria-current={selected ? 'page' : undefined}
          data-conversation-id={conversation.id}
        />
      }
    >
      {content}
    </Item>
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
      <Empty
        className="flex-1 rounded-none border-0 p-8"
        data-test="inbox-empty"
      >
        <EmptyHeader>
          <EmptyDescription>
            {emptyText ??
              (archived
                ? m.inboxList_noArchivedText()
                : m.inboxList_noConversationsText())}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
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
