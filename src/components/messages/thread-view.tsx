"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { Link, useNavigate } from "@tanstack/react-router";

import { ArrowLeft } from "@untitledui/icons";

import {
  isColdRule,
  isOwnMessage,
  lastOwnMessageId,
  type BlockStatus,
  type ConversationDetail,
  type ListEnvelope,
  type Message,
} from "@cavuno/board";

import {
  archiveConversation,
  blockUser,
  getThread,
  markRead,
  unarchiveConversation,
  unblockUser,
} from "../../server/messaging";
import { daySeparator } from "../../lib/message-format";
import { useVisiblePoll } from "../../lib/use-visible-poll";
import { Avatar } from "./avatar";
import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { m } from "../../paraglide/messages";

function sameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

export function ThreadView({
  conversation,
  messages: initialMessages,
  blockStatus: initialBlock,
}: {
  conversation: ConversationDetail;
  messages: ListEnvelope<Message>;
  blockStatus: BlockStatus;
}) {
  const navigate = useNavigate();
  const counterparty = conversation.counterparty;
  const [messages, setMessages] = useState<Message[]>(initialMessages.data);
  const [blocked, setBlocked] = useState(initialBlock.blocked);
  // Tracked in state (not derived from the immutable loader prop) so an
  // in-session unarchive flips the menu without a reload.
  const [isArchived, setIsArchived] = useState(conversation.archivedAt !== null);
  const endRef = useRef<HTMLDivElement>(null);
  const latestId = messages[messages.length - 1]?.id;

  const refresh = () => {
    void getThread({ data: { id: conversation.id } })
      .then((result) => {
        setMessages(result.messages.data);
        setBlocked(result.blockStatus.blocked);
      })
      // Transient poll failures self-heal on the next tick; a persistent one
      // surfaces when the user next acts (composer/actions show their errors).
      .catch(() => {});
  };
  useVisiblePoll(refresh);

  // Mark read on open and whenever a new latest message arrives.
  useEffect(() => {
    void markRead({ data: { id: conversation.id } });
  }, [conversation.id, latestId]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [latestId]);

  // Cold-message rule (client-side mirror of the server gate).
  const coldRule = isColdRule(messages, counterparty.boardUserId);
  const lastOwnId = lastOwnMessageId(messages, counterparty.boardUserId);

  const label = counterparty.companyName
    ? `${counterparty.displayName} · ${counterparty.companyName}`
    : counterparty.displayName;

  const disabledHint = blocked
    ? m.threadView_blockedHintText({ name: counterparty.displayName })
    : coldRule
      ? m.threadView_coldRuleHintText({ name: counterparty.displayName })
      : null;

  return (
    <div className="border-secondary flex h-[calc(100dvh-11rem)] min-h-[440px] flex-col rounded-lg border">
      <header className="border-secondary flex items-center gap-3 border-b p-3">
        <Link
          to="/messages"
          aria-label={m.threadView_backToInboxAriaLabel()}
          className="rounded-md text-fg-quaternary outline-focus-ring hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar url={counterparty.avatarUrl} name={counterparty.displayName} />
        {counterparty.companySlug ? (
          <Link
            to="/companies/$companySlug"
            params={{ companySlug: counterparty.companySlug }}
            className="min-w-0 flex-1 truncate font-medium hover:underline"
          >
            {label}
          </Link>
        ) : (
          <p className="min-w-0 flex-1 truncate font-medium">{label}</p>
        )}

        <Dropdown.Root>
          <Dropdown.DotsButton
            aria-label={m.threadView_conversationActionsAriaLabel()}
            data-test="thread-actions"
          />
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu>
              {isArchived ? (
                <Dropdown.Item
                  label={m.threadView_unarchiveLabel()}
                  onAction={() =>
                    void unarchiveConversation({
                      data: { id: conversation.id },
                    }).then(() => {
                      setIsArchived(false);
                      refresh();
                    })
                  }
                />
              ) : (
                <Dropdown.Item
                  label={m.threadView_archiveLabel()}
                  onAction={() =>
                    void archiveConversation({
                      data: { id: conversation.id },
                    }).then(() => navigate({ to: "/messages" }))
                  }
                />
              )}
              {blocked ? (
                <Dropdown.Item
                  label={m.threadView_unblockLabel()}
                  onAction={() =>
                    void unblockUser({
                      data: { boardUserId: counterparty.boardUserId },
                    }).then(() => setBlocked(false))
                  }
                />
              ) : (
                <Dropdown.Item
                  label={m.threadView_blockLabel()}
                  onAction={() =>
                    void blockUser({
                      data: { boardUserId: counterparty.boardUserId },
                    }).then(() => navigate({ to: "/messages" }))
                  }
                />
              )}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4" data-test="message-stream">
        {messages.length === 0 ? (
          <p className="text-tertiary text-center text-sm">
            {m.threadView_noMessagesText()}
          </p>
        ) : null}
        {messages.map((message, index) => {
          const prev = messages[index - 1];
          const showDay = !prev || !sameDay(prev.sentAt, message.sentAt);
          return (
            <Fragment key={message.id}>
              {showDay ? (
                <p className="text-tertiary py-2 text-center text-xs">
                  {daySeparator(message.sentAt)}
                </p>
              ) : null}
              <MessageBubble
                message={message}
                own={isOwnMessage(message, counterparty.boardUserId)}
                showSeen={message.id === lastOwnId}
                onChanged={refresh}
                onReported={() => navigate({ to: "/messages" })}
              />
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>

      <Composer
        conversationId={conversation.id}
        disabled={blocked || coldRule}
        hint={disabledHint}
        onSent={refresh}
      />
    </div>
  );
}
