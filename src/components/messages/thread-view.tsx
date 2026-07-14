'use client';

import { Fragment, useState } from 'react';

import {
  isColdRule,
  isOwnMessage,
  lastOwnMessageId,
  type ConversationDetail,
  type Message,
} from '@cavuno/board';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, MoreHorizontal, X } from 'lucide-react';

import { errorMessage } from '../../lib/message-error';
import { m } from '../../paraglide/messages';
import { Avatar } from './avatar';
import { Composer } from './composer';
import { HydrationSafeDate, useHydrated } from './hydration-safe-date';
import { MessageBubble } from './message-bubble';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Marker, MarkerContent } from '@/components/ui/marker';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';

type ReportReason = 'spam' | 'harassment' | 'misrepresentation' | 'other';

function sameDay(first: string, second: string, local: boolean) {
  const firstDate = new Date(first);
  const secondDate = new Date(second);
  if (!local) {
    return (
      firstDate.getUTCFullYear() === secondDate.getUTCFullYear() &&
      firstDate.getUTCMonth() === secondDate.getUTCMonth() &&
      firstDate.getUTCDate() === secondDate.getUTCDate()
    );
  }
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

export function ThreadView({
  conversation,
  messages,
  blocked,
  statusError,
  companyHref,
  onBack,
  onClose,
  onArchive,
  onUnarchive,
  onBlock,
  onUnblock,
  onEditMessage,
  onUnsendMessage,
  onReportMessage,
  onSend,
  onRefresh,
  onReported,
}: {
  conversation: ConversationDetail;
  messages: Message[];
  blocked: boolean;
  statusError?: string | null;
  companyHref?: string;
  onBack?: () => void;
  onClose?: () => void;
  onArchive: () => Promise<unknown>;
  onUnarchive: () => Promise<unknown>;
  onBlock: () => Promise<unknown>;
  onUnblock: () => Promise<unknown>;
  onEditMessage: (messageId: string, body: string) => Promise<unknown>;
  onUnsendMessage: (messageId: string) => Promise<unknown>;
  onReportMessage: (
    messageId: string,
    reason: ReportReason,
  ) => Promise<unknown>;
  onSend: (body: string) => Promise<void>;
  onRefresh: () => void;
  onReported: () => void;
}) {
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const hydrated = useHydrated();
  const counterparty = conversation.counterparty;
  const latestOwnMessageId = lastOwnMessageId(
    messages,
    counterparty.boardUserId,
  );
  const coldRule = isColdRule(messages, counterparty.boardUserId);
  const lastReadIndex = conversation.viewerLastReadMessageId
    ? messages.findIndex(
        (message) => message.id === conversation.viewerLastReadMessageId,
      )
    : -1;
  const unreadStartIndex = conversation.hasUnread
    ? Math.min(lastReadIndex + 1, messages.length - 1)
    : -1;
  const label = counterparty.companyName
    ? `${counterparty.displayName} · ${counterparty.companyName}`
    : counterparty.displayName;
  const roleLabel =
    conversation.viewerRole === 'employer'
      ? m.threadView_candidateLabel()
      : m.threadView_employerLabel();
  const disabledHint = blocked
    ? m.threadView_blockedHintText({ name: counterparty.displayName })
    : coldRule
      ? m.threadView_coldRuleHintText({ name: counterparty.displayName })
      : null;

  const runConversationAction = async (action: () => Promise<unknown>) => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="bg-card flex size-full min-h-0 flex-col">
      <header className="border-border flex h-16 shrink-0 items-center gap-3 border-b px-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={m.threadView_backToInboxAriaLabel()}
            className="md:hidden"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
        ) : null}
        <Avatar
          url={counterparty.avatarUrl}
          name={counterparty.displayName}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          {companyHref ? (
            <h2 className="truncate font-semibold">
              <Link to={companyHref} className="hover:underline">
                {label}
              </Link>
            </h2>
          ) : (
            <h2 className="truncate font-semibold">{label}</h2>
          )}
          <p className="text-muted-foreground text-xs">{roleLabel}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={m.threadView_conversationActionsAriaLabel()}
                data-test="thread-actions"
              />
            }
          >
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation.archivedAt ? (
              <DropdownMenuItem
                disabled={actionBusy}
                onClick={() => void runConversationAction(onUnarchive)}
              >
                {m.threadView_unarchiveLabel()}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={actionBusy}
                onClick={() => void runConversationAction(onArchive)}
              >
                {m.threadView_archiveLabel()}
              </DropdownMenuItem>
            )}
            {blocked ? (
              <DropdownMenuItem
                disabled={actionBusy}
                onClick={() => void runConversationAction(onUnblock)}
              >
                {m.threadView_unblockLabel()}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                disabled={actionBusy}
                onClick={() => void runConversationAction(onBlock)}
              >
                {m.threadView_blockLabel()}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={m.messagingDock_closeConversationAriaLabel()}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </header>

      {(actionError ?? statusError) ? (
        <p
          role="alert"
          className="border-border text-destructive border-b px-4 py-2 text-sm"
        >
          {actionError ?? statusError}
        </p>
      ) : null}

      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller
          data-testid="message-stream"
          data-test="message-stream"
        >
          <MessageScrollerViewport aria-label={label}>
            <MessageScrollerContent className="gap-4 p-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground m-auto text-center text-sm">
                  {m.threadView_noMessagesText()}
                </p>
              ) : null}
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const showDay =
                  !previous ||
                  !sameDay(previous.sentAt, message.sentAt, hydrated);
                return (
                  <Fragment key={message.id}>
                    {showDay ? (
                      <Marker variant="separator">
                        <MarkerContent>
                          <HydrationSafeDate
                            iso={message.sentAt}
                            presentation="day"
                          />
                        </MarkerContent>
                      </Marker>
                    ) : null}
                    {index === unreadStartIndex ? (
                      <Marker variant="separator">
                        <MarkerContent>
                          {m.threadView_unreadMessagesLabel()}
                        </MarkerContent>
                      </Marker>
                    ) : null}
                    <MessageScrollerItem
                      messageId={message.id}
                      data-message-id={message.id}
                    >
                      <MessageBubble
                        message={message}
                        own={isOwnMessage(message, counterparty.boardUserId)}
                        showSeen={message.id === latestOwnMessageId}
                        onChanged={onRefresh}
                        onReported={onReported}
                        onEdit={(body) => onEditMessage(message.id, body)}
                        onUnsend={() => onUnsendMessage(message.id)}
                        onReport={(reason) =>
                          onReportMessage(message.id, reason)
                        }
                      />
                    </MessageScrollerItem>
                  </Fragment>
                );
              })}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton
            direction="end"
            label={m.threadView_scrollToLatestLabel()}
          />
        </MessageScroller>
      </MessageScrollerProvider>

      <Composer
        disabled={blocked || coldRule}
        hint={disabledHint}
        onSend={onSend}
        onSent={onRefresh}
      />
    </div>
  );
}
