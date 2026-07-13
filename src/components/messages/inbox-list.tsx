"use client";

import { useState } from "react";

import { Link } from "@tanstack/react-router";

import type { Conversation, ListEnvelope } from "@cavuno/board";

import { getInbox } from "../../server/messaging";
import { relativeTime } from "../../lib/message-format";
import { useVisiblePoll } from "../../lib/use-visible-poll";
import { Avatar } from "./avatar";
import { Button } from "@/components/base/buttons/button";
import { m } from "../../paraglide/messages";

/** Newest-first, de-duplicated by id (later occurrence wins the fresher copy). */
function dedupeSort(list: Conversation[]): Conversation[] {
  const byId = new Map<string, Conversation>();
  for (const c of list) byId.set(c.id, c);
  return [...byId.values()].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

function counterpartyLabel(c: Conversation): string {
  const { displayName, companyName } = c.counterparty;
  return companyName ? `${displayName} · ${companyName}` : displayName;
}

export function InboxList({
  initial,
  archived,
}: {
  initial: ListEnvelope<Conversation>;
  archived: boolean;
}) {
  const [rows, setRows] = useState<Conversation[]>(initial.data);
  const [nextCursor, setNextCursor] = useState<string | null>(initial.nextCursor);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  // Poll page 1 and merge over the accumulated rows so load-more pages survive
  // a refresh and a bumped conversation floats to the top.
  useVisiblePoll(() => {
    void getInbox({ data: { archived } }).then(({ conversations }) => {
      setRows((prev) => dedupeSort([...prev, ...conversations.data]));
    });
  });

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const { conversations } = await getInbox({
        data: { archived, cursor: nextCursor },
      });
      setRows((prev) => dedupeSort([...prev, ...conversations.data]));
      setNextCursor(conversations.nextCursor);
      setHasMore(conversations.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  if (rows.length === 0) {
    return (
      <p className="text-tertiary py-10 text-center text-sm" data-test="inbox-empty">
        {archived ? m.inboxList_noArchivedText() : m.inboxList_noConversationsText()}
      </p>
    );
  }

  return (
    <div className="space-y-1" data-test="inbox-list">
      <ul className="divide-secondary divide-y">
        {rows.map((c) => (
          <li key={c.id}>
            <Link
              to="/messages/$conversationId"
              params={{ conversationId: c.id }}
              className="flex items-center gap-3 rounded-lg px-2 py-3 outline-focus-ring hover:bg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
              data-conversation-id={c.id}
            >
              <Avatar url={c.counterparty.avatarUrl} name={c.counterparty.displayName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{counterpartyLabel(c)}</p>
                  <span className="text-tertiary shrink-0 text-xs">
                    {relativeTime(c.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-tertiary truncate text-sm">
                    {c.lastMessageSnippet || m.messageBubble_messageDeletedText()}
                  </p>
                  {c.hasUnread ? (
                    <span
                      className="ml-auto size-2 shrink-0 rounded-full bg-red-500"
                      aria-label={m.inboxList_unreadAriaLabel()}
                      data-test="unread-dot"
                    />
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <div className="pt-2 text-center">
          <Button color="secondary" size="sm" onClick={loadMore} isDisabled={loadingMore}>
            {loadingMore ? m.inboxList_loadingLabel() : m.inboxList_loadMoreLabel()}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
