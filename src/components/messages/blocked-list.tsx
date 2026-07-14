import { m } from '../../paraglide/messages';
import { Avatar } from './avatar';

import { Button } from '@/components/ui/button';
import type { BlockedUser } from '@cavuno/board';

export function BlockedList({
  users,
  pendingUserId,
  onUnblock,
  emptyText,
}: {
  users: BlockedUser[];
  pendingUserId: string | null;
  onUnblock: (boardUserId: string) => void;
  emptyText?: string;
}) {
  if (users.length === 0) {
    return (
      <p
        className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center text-sm"
        data-test="blocked-empty"
      >
        {emptyText ?? m.blockedList_emptyText()}
      </p>
    );
  }

  return (
    <ul className="divide-border divide-y" data-test="blocked-list">
      {users.map((user) => (
        <li
          key={user.id}
          className="flex items-center gap-3 px-3 py-3"
          data-blocked-user-id={user.boardUserId}
        >
          <Avatar
            url={user.avatarUrl}
            name={user.displayName}
            className="size-10"
          />
          <p className="min-w-0 flex-1 truncate font-medium">
            {user.displayName}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUnblock(user.boardUserId)}
            disabled={pendingUserId === user.boardUserId}
          >
            {pendingUserId === user.boardUserId
              ? m.blockedList_unblockingLabel()
              : m.blockedList_unblockLabel()}
          </Button>
        </li>
      ))}
    </ul>
  );
}
