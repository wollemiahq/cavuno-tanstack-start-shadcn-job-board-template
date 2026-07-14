'use client';

import { useEffect, useRef, useState } from 'react';

import { companyPath } from '@cavuno/board/paths';

import {
  MessagesSidebarController,
  ThreadController,
} from './-messages-runtime';

import { MessagingDock } from '@/components/messages/messaging-dock';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useVisiblePoll } from '@/lib/use-visible-poll';
import { m } from '@/paraglide/messages';
import { getInbox, getThread, getUnreadCount } from '@/server/messaging';
import type {
  Conversation,
  ConversationDetail,
  ListEnvelope,
  Message,
} from '@cavuno/board';

type ThreadPayload = {
  conversation: ConversationDetail;
  messages: ListEnvelope<Message>;
  blockStatus: { object: 'block_status'; blocked: boolean };
};

function InboxLoading() {
  return (
    <div className="space-y-3 p-3" aria-hidden="true">
      <Skeleton className="h-8 w-full rounded-2xl" />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 py-2">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadFailure({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p role="alert" className="text-muted-foreground text-sm">
        {message}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {m.messagingDock_retryLabel()}
      </Button>
    </div>
  );
}

export function MessagesDockController() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inbox, setInbox] = useState<ListEnvelope<Conversation> | null>(null);
  const [inboxError, setInboxError] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [thread, setThread] = useState<ThreadPayload | null>(null);
  const [threadError, setThreadError] = useState(false);
  const requestSequence = useRef(0);

  const refreshInbox = async () => {
    try {
      const [unread, result] = await Promise.all([
        getUnreadCount(),
        getInbox(),
      ]);
      setUnreadCount(unread.count);
      setInbox(result.conversations);
      setInboxError(false);
    } catch {
      setInboxError(true);
    }
  };

  useEffect(() => {
    void refreshInbox();
  }, []);

  useVisiblePoll(() => {
    void refreshInbox();
  });

  const selectConversation = async (conversationId: string) => {
    const request = ++requestSequence.current;
    setSelectedConversationId(conversationId);
    setThread(null);
    setThreadError(false);
    try {
      const result = await getThread({ data: { id: conversationId } });
      if (request === requestSequence.current) setThread(result);
    } catch {
      if (request === requestSequence.current) setThreadError(true);
    }
  };

  const closeConversation = () => {
    requestSequence.current += 1;
    setSelectedConversationId(null);
    setThread(null);
    setThreadError(false);
  };

  const selectedConversation = inbox?.data.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const conversationName =
    thread?.conversation.counterparty.displayName ??
    selectedConversation?.counterparty.displayName ??
    m.messagesPage_conversationTitle();
  const conversationLabel = m.messagingDock_conversationAriaLabel({
    name: conversationName,
  });

  return (
    <MessagingDock
      open={open}
      unreadCount={unreadCount}
      messagesLabel={m.messagingDock_messagesLabel()}
      openMessagesLabel={m.messagingDock_openAriaLabel({ count: unreadCount })}
      minimizeMessagesLabel={m.messagingDock_minimizeAriaLabel()}
      closeConversationLabel={m.messagingDock_closeConversationAriaLabel()}
      conversationLabel={conversationLabel}
      onOpenChange={setOpen}
      onCloseConversation={closeConversation}
      inbox={
        inbox ? (
          <MessagesSidebarController
            view="inbox"
            initialInbox={inbox}
            selectedConversationId={selectedConversationId ?? undefined}
            onSelect={(conversationId) =>
              void selectConversation(conversationId)
            }
            showTitle={false}
            showTabs={false}
          />
        ) : inboxError ? (
          <LoadFailure
            message={m.messagingDock_inboxErrorText()}
            onRetry={() => void refreshInbox()}
          />
        ) : (
          <InboxLoading />
        )
      }
      conversation={
        selectedConversationId ? (
          thread ? (
            <ThreadController
              key={thread.conversation.id}
              initialConversation={thread.conversation}
              initialMessages={thread.messages}
              initialBlockStatus={thread.blockStatus}
              companyHref={
                thread.conversation.counterparty.companySlug
                  ? companyPath(thread.conversation.counterparty.companySlug)
                  : undefined
              }
              onClose={closeConversation}
              onExit={() => {
                closeConversation();
                void refreshInbox();
              }}
            />
          ) : threadError ? (
            <LoadFailure
              message={m.messagingDock_conversationErrorText()}
              onRetry={() => void selectConversation(selectedConversationId)}
            />
          ) : (
            <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center p-8 text-sm">
              {m.messagingDock_loadingConversationText()}
            </div>
          )
        ) : undefined
      }
      conversationHasOwnHeader={Boolean(thread)}
    />
  );
}
