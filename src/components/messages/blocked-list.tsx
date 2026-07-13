"use client";

import { useState } from "react";

import type { BlockedUser } from "@cavuno/board";

import { unblockUser } from "../../server/messaging";
import { Avatar } from "./avatar";
import { Button } from "@/components/base/buttons/button";
import { m } from "../../paraglide/messages";

export function BlockedList({ initial }: { initial: BlockedUser[] }) {
  const [rows, setRows] = useState<BlockedUser[]>(initial);
  const [pending, setPending] = useState<string | null>(null);

  const unblock = async (boardUserId: string) => {
    setPending(boardUserId);
    try {
      await unblockUser({ data: { boardUserId } });
      setRows((prev) => prev.filter((r) => r.boardUserId !== boardUserId));
    } finally {
      setPending(null);
    }
  };

  if (rows.length === 0) {
    return (
      <p className="text-tertiary py-10 text-center text-sm" data-test="blocked-empty">
        {m.blockedList_emptyText()}
      </p>
    );
  }

  return (
    <ul className="divide-secondary divide-y" data-test="blocked-list">
      {rows.map((u) => (
        <li
          key={u.id}
          className="flex items-center gap-3 px-2 py-3"
          data-blocked-user-id={u.boardUserId}
        >
          <Avatar url={u.avatarUrl} name={u.displayName} />
          <p className="min-w-0 flex-1 truncate font-medium">{u.displayName}</p>
          <Button
            color="secondary"
            size="sm"
            onClick={() => unblock(u.boardUserId)}
            isDisabled={pending === u.boardUserId}
          >
            {pending === u.boardUserId
              ? m.blockedList_unblockingLabel()
              : m.blockedList_unblockLabel()}
          </Button>
        </li>
      ))}
    </ul>
  );
}
