'use client';

import { useEffect, useState } from 'react';

import { Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';

import { m } from '../paraglide/messages';
import {
  mergeConversations,
  mergeMessages,
  type MessagesView,
} from './-messages-controller';

import { BlockedList } from '@/components/messages/blocked-list';
import { InboxList } from '@/components/messages/inbox-list';
import { ThreadView } from '@/components/messages/thread-view';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { errorMessage } from '@/lib/message-error';
import { useVisiblePoll } from '@/lib/use-visible-poll';
import { cn } from '@/lib/utils';
import {
  archiveConversation,
  blockUser,
  editMessage,
  getInbox,
  getThread,
  markRead,
  reportMessage,
  sendReply,
  unarchiveConversation,
  unblockUser,
  unsendMessage,
} from '@/server/messaging';
import type {
  BlockStatus,
  BlockedUser,
  Conversation,
  ConversationDetail,
  ListEnvelope,
  Message,
} from '@cavuno/board';

const MESSAGING_POLL_INTERVAL_MS = 15_000;

export function InboxController({
  initial,
  archived,
  selectedConversationId,
  onSelect,
  query = '',
}: {
  initial: ListEnvelope<Conversation>;
  archived: boolean;
  selectedConversationId?: string;
  onSelect?: (conversationId: string) => void;
  query?: string;
}) {
  const [conversations, setConversations] = useState(initial.data);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useVisiblePoll(() => {
    void getInbox({ data: { archived } })
      .then(({ conversations: page }) => {
        setConversations((current) => mergeConversations(current, page.data));
        setLoadError(null);
      })
      .catch((error) => setLoadError(errorMessage(error)));
  }, MESSAGING_POLL_INTERVAL_MS);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleConversations = normalizedQuery
    ? conversations.filter((conversation) => {
        const searchable = [
          conversation.counterparty.displayName,
          conversation.counterparty.companyName,
          conversation.lastMessageSnippet,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase();
        return searchable.includes(normalizedQuery);
      })
    : conversations;

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const { conversations: page } = await getInbox({
        data: { archived, cursor: nextCursor },
      });
      setConversations((current) => mergeConversations(current, page.data));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      {loadError ? (
        <Alert
          variant="destructive"
          className="rounded-none border-x-0 border-t-0"
        >
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
      <InboxList
        conversations={visibleConversations}
        archived={archived}
        selectedConversationId={selectedConversationId}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={() => void loadMore()}
        onSelect={onSelect}
        emptyText={
          normalizedQuery ? m.messagesPage_noSearchResultsText() : undefined
        }
      />
    </>
  );
}

export function BlockedController({
  initial,
  query = '',
}: {
  initial: BlockedUser[];
  query?: string;
}) {
  const [users, setUsers] = useState(initial);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleUsers = normalizedQuery
    ? users.filter((user) =>
        user.displayName.toLocaleLowerCase().includes(normalizedQuery),
      )
    : users;

  const unblock = async (boardUserId: string) => {
    setPendingUserId(boardUserId);
    setActionError(null);
    try {
      await unblockUser({ data: { boardUserId } });
      setUsers((current) =>
        current.filter((user) => user.boardUserId !== boardUserId),
      );
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <>
      {actionError ? (
        <Alert
          variant="destructive"
          className="rounded-none border-x-0 border-t-0"
        >
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <BlockedList
        users={visibleUsers}
        pendingUserId={pendingUserId}
        onUnblock={(boardUserId) => void unblock(boardUserId)}
        emptyText={
          normalizedQuery ? m.messagesPage_noSearchResultsText() : undefined
        }
      />
    </>
  );
}

const MESSAGE_TABS: { view: MessagesView; label: () => string }[] = [
  { view: 'inbox', label: m.messagesPage_inboxTabLabel },
  { view: 'archived', label: m.messagesPage_archivedTabLabel },
  { view: 'blocked', label: m.messagesPage_blockedTabLabel },
];

type MessagesSidebarControllerProps = {
  view: MessagesView;
  initialInbox?: ListEnvelope<Conversation>;
  initialBlocked?: BlockedUser[];
  selectedConversationId?: string;
  onSelect?: (conversationId: string) => void;
  showTitle?: boolean;
  showTabs?: boolean;
};

export function MessagesSidebarController({
  view,
  initialInbox,
  initialBlocked,
  selectedConversationId,
  onSelect,
  showTitle = true,
  showTabs = true,
}: MessagesSidebarControllerProps) {
  const [query, setQuery] = useState('');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showTitle ? (
        <div className="border-border flex h-16 shrink-0 items-center border-b px-4">
          <h1 className="text-lg font-semibold">{m.messagesPage_title()}</h1>
        </div>
      ) : null}

      <div className="border-border shrink-0 border-b p-3">
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={m.messagesPage_searchPlaceholder()}
            aria-label={m.messagesPage_searchPlaceholder()}
          />
        </InputGroup>
      </div>

      {showTabs ? (
        <nav
          aria-label={m.messagesPage_title()}
          className="border-border flex shrink-0 gap-1 overflow-x-auto border-b px-2"
          data-test="message-tabs"
        >
          {MESSAGE_TABS.map((tab) => (
            <Link
              key={tab.view}
              to="/messages"
              search={tab.view === 'inbox' ? {} : { view: tab.view }}
              className={cn(
                'border-b-2 px-3 py-2 text-sm',
                view === tab.view
                  ? 'border-primary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {tab.label()}
            </Link>
          ))}
        </nav>
      ) : null}

      {view === 'blocked' && initialBlocked ? (
        <BlockedController initial={initialBlocked} query={query} />
      ) : initialInbox ? (
        <InboxController
          key={view}
          initial={initialInbox}
          archived={view === 'archived'}
          selectedConversationId={selectedConversationId}
          onSelect={onSelect}
          query={query}
        />
      ) : null}
    </div>
  );
}

export function ThreadController({
  initialConversation,
  initialMessages,
  initialBlockStatus,
  companyHref,
  onBack,
  onClose,
  onExit,
}: {
  initialConversation: ConversationDetail;
  initialMessages: ListEnvelope<Message>;
  initialBlockStatus: BlockStatus;
  companyHref?: string;
  onBack?: () => void;
  onClose?: () => void;
  onExit: () => void;
}) {
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState(initialMessages.data);
  const [blocked, setBlocked] = useState(initialBlockStatus.blocked);
  const [syncError, setSyncError] = useState<string | null>(null);
  const latestMessageId = messages.at(-1)?.id;

  const refresh = async () => {
    try {
      const result = await getThread({ data: { id: conversation.id } });
      setConversation(result.conversation);
      setMessages((current) => mergeMessages(current, result.messages.data));
      setBlocked(result.blockStatus.blocked);
      setSyncError(null);
    } catch (error) {
      setSyncError(errorMessage(error));
      throw error;
    }
  };

  useVisiblePoll(() => {
    void refresh().catch(() => {});
  }, MESSAGING_POLL_INTERVAL_MS);

  useEffect(() => {
    void markRead({ data: { id: conversation.id } }).catch((error) =>
      setSyncError(errorMessage(error)),
    );
  }, [conversation.id, latestMessageId]);

  return (
    <ThreadView
      conversation={conversation}
      messages={messages}
      blocked={blocked}
      statusError={syncError}
      companyHref={companyHref}
      onBack={onBack}
      onClose={onClose}
      onArchive={async () => {
        await archiveConversation({ data: { id: conversation.id } });
        onExit();
      }}
      onUnarchive={async () => {
        await unarchiveConversation({ data: { id: conversation.id } });
        setConversation((current) => ({ ...current, archivedAt: null }));
      }}
      onBlock={async () => {
        await blockUser({
          data: { boardUserId: conversation.counterparty.boardUserId },
        });
        onExit();
      }}
      onUnblock={async () => {
        await unblockUser({
          data: { boardUserId: conversation.counterparty.boardUserId },
        });
        setBlocked(false);
      }}
      onEditMessage={async (messageId, body) => {
        await editMessage({ data: { id: messageId, body: { body } } });
      }}
      onUnsendMessage={async (messageId) => {
        await unsendMessage({ data: { id: messageId } });
      }}
      onReportMessage={async (messageId, reason) => {
        await reportMessage({ data: { id: messageId, body: { reason } } });
        setBlocked(true);
      }}
      onSend={async (body) => {
        const sent = await sendReply({
          data: { id: conversation.id, body: { body } },
        });
        setMessages((current) => mergeMessages(current, [sent]));
      }}
      onRefresh={() => void refresh().catch(() => {})}
      onReported={onExit}
    />
  );
}
